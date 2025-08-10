import * as Responses from './src/utils/response.js';
import Logger from './src/features/logger.js';
import { ProxyNodeSchema, V2RAY_SCHEMES } from './src/features/UnifiedNode.js';
import { generateBrowserHeaders } from './src/features/headers.js';
import { isBase64, safeAtob } from './src/features/base64.js';
import handleStaticRequest from './src/handlers/static.js';
import handleSubParse from './src/handlers/subParser/index.js';
import handleNodesParse from './src/handlers/nodeParser/index.js';
import handleGenerateSub from './src/handlers/nodeGenerator/index.js';
import YAML from 'js-yaml';

/**
 * 订阅类型枚举
 * @enum {string}
 */
const SubType = {
  SING_BOX: 'sing-box',
  CLASH: 'clash',
  V2RAY: 'v2ray',
  UNKNOWN: 'unknown',
};

/**
 * 识别订阅内容的类型
 * @param {string} content - 从订阅链接获取的字符串内容。
 * @returns {SubscriptionType} - 识别出的订阅类型。
 */
function identifySubType(content) {
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return SubType.UNKNOWN;
  }

  // 尝试解析为 Sing-box (JSON)
  try {
    const data = JSON.parse(content);
    // 验证关键字段，`outbounds` 是 Sing-box 配置的核心
    if (data && typeof data === 'object' && data.outbounds && Array.isArray(data.outbounds)) {
      return SubType.SING_BOX;
    }
  } catch (err) {};

  // 尝试解析为 Clash (YAML)
  try {
    const data = YAML.load(content);
    // 验证关键字段，`proxies` 是 Clash 配置的核心
    // `proxy-groups` 和 `rules` 也是强特征
    if (data && typeof data === 'object' && (data.proxies || data['proxy-groups'])) {
      return SubType.CLASH;
    }
  } catch (error) {};

  // 尝试解析为 V2Ray/Xray
  const lines = content.trim().split(/\r?\n/);
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && V2RAY_SCHEMES.some(scheme => trimmedLine.startsWith(scheme))) {
      return SubType.V2RAY;
    }
  }

  // 如果所有检查都失败
  return SubType.UNKNOWN;
}

export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {ExecutionContext} ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname, searchParams, origin } = url;
    const logger = new Logger(request, env, ctx); // 初始化日志记录器

    const staticHandler = await handleStaticRequest(request, env, ctx);
    if (staticHandler) return staticHandler;

    if (pathname.startsWith('/sub')) {
      try {
        // 订阅URL
        const subUrl = decodeURIComponent(searchParams.get('url') || '');
        // 目标订阅类型
        const target = searchParams.get('target')?.toLowerCase() || '';
        // User-Agent
        const ua = searchParams.get('ua') || 'default';
        // 测试模式
        const testOnly = searchParams.get('testOnly') || 'false';
        // 严格模式
        const strict = searchParams.get('strict') || 'false';

        logger.info('Received subscription conversion request', {
          subUrl,
          target,
          ua,
          testOnly,
          strict,
        });

        if (!subUrl || !target) return Responses.sub('Invalid request, missing url or target', 400);

        // 判断 target 是否支持
        if (!Object.values(SubType).includes(target)) {
          return Responses.sub('Unsupported target type', 400);
        }

        // 生成请求头
        const requestHeaders = generateBrowserHeaders(ua);

        // 读取缓存
        const cache = caches.default;
        const cachedResponse = await cache.match(subUrl);
        if (cachedResponse) {
          logger.info('Found cached response, returning early');
          return cachedResponse;
        }
        
        // 获取目标订阅
        const subresponse = await fetch(subUrl, { headers: requestHeaders });
        if (!subresponse.ok) return Responses.sub('Failed to fetch subscription', 500);

        // 读取内容
        const subText = await subresponse.text();

        // 预处理 Base64
        const normalizedContent = subText.replace(/_/g, '/').replace(/-/g, '+');
        let subStr = '';
        if (isBase64(normalizedContent)) {
          subStr = safeAtob(normalizedContent).trim();
        } else {
          subStr = subText.trim();
        }

        // 分辨订阅类型
        const subType = identifySubType(subStr);
        if (subType === SubType.UNKNOWN) return Responses.sub('Unsupported subscription type', 400);
        logger.info('Identified subscription type', { subType });

        // 分离出节点
        const parsedNodes = handleSubParse(subStr, subType);
        if (!parsedNodes) return Responses.sub('Failed to parse subscription', 500);
        logger.info('Parsed nodes', { nodeCount: parsedNodes.length });

        // 将节点解析到统一模板
        const { nodes: unifiedNodes, nodeCounter, convertCounter } = handleNodesParse(parsedNodes, subType);
        if (!unifiedNodes) return Responses.sub('Failed to parse nodes', 500);
        logger.info('Unified nodes', { nodeCounter, convertCounter });
        
        // 验证节点
        let validNodes = [];
        for (const [index, node] of unifiedNodes.entries()) {
          if (!node) continue;
          const result = ProxyNodeSchema.safeParse(node);
          if (!result.success) {
            const errorMsg = result.error.issues.map(issue => ({
              path: issue.path.join('.'),
              message: issue.message,
              code: issue.code,
            }));
            if (strict === 'true') {
              throw new Error(`Node at index ${index} failed validation: ${JSON.stringify(errorMsg, null, 2)} ${JSON.stringify(node, null, 2)}`);
            }
            logger.warn(`Node at index ${index} failed validation: ${JSON.stringify(errorMsg, null, 2)} ${JSON.stringify(node, null, 2)}`);
            continue;
          }
          validNodes.push(node);
        }
        logger.info('Validated nodes', { nodeCount: validNodes.length });

        // 测试模式
        if (testOnly === 'true') {
          logger.info('Test mode enabled, returning early');
          return Responses.sub('Test passed', 200, { nodeCount: parsedNodes.length, validNodeCount: validNodes.length });
        }

        // 生成目标订阅
        const generatedSub = handleGenerateSub(validNodes, target);
        if (!generatedSub) return Responses.sub('Failed to generate subscription', 500);

        // 根据目标类型决定返回的 Content-Type
        let contentType = 'text/plain; charset=utf-8';
        if (target === 'clash') {
          contentType = 'text/yaml; charset=utf-8';
        } else if (target === 'v2ray') {
          contentType = 'text/plain; charset=utf-8';
        }

        return Responses.normal(generatedSub, 200, {}, contentType);

      } catch (err) {
        console.error(err);
        return Responses.sub(err.message, 500);
      }
    }
	
    return Responses.normal('Not Found', 404);
  }
};