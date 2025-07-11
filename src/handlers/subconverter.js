import { createResponse } from '../utils/response.js';
import { generateBrowserHeaders } from '../features/headers.js';
import { isBase64, safeBtoa, safeAtob } from '../features/base64.js';
import { convertClashToV2ray } from '../converters/clashtov2ray.js';
// import { convertV2rayToClash } from '../converters/v2raytoclash.js';

/**
 * 处理订阅转换请求。
 * @param {Request} request - HTTP 请求对象。
 * @param {Object} env - 环境变量对象。
 * @param {Object} ctx - 上下文对象。
 * @returns {Promise<Response>}
 */
export async function handleSubRequest(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname, searchParams, origin } = url;
    const requestHeaders = generateBrowserHeaders();

    const target = searchParams.get('target');
    let suburl = searchParams.get('url');
  
    if (!target || !suburl) {
      return createResponse('Invalid request', 400);
    }

    if (suburl === 'testv2' || suburl === 'test') {
        suburl = "https://subpool.illusionlie.com/testtoken?v2ray";
    } else if (suburl === 'testclash') {
        suburl = "https://subpool.illusionlie.com/testtoken?clash";
    }

    const subresponse = await fetch(suburl, { headers: requestHeaders });
    const substr = await subresponse.text();
  
    // TODO: 检测目标订阅是Clash还是V2ray(Base64)
    // 目前从零开始, 只处理Clash和V2ray的互相转换和识别, 使用tindy2013/subconverter的标准

    if (target === 'clash') {
        if (isBase64(substr)) {
            // V2ray to Clash
            const clashConfig = convertV2rayToClash(substr);
            return createResponse(clashConfig, 200, {}, 'application/yaml');
        } else {
            // Clash to Clash
            return createResponse(substr, 200, {}, 'application/yaml');
        }
    } else if (target === 'v2ray') {
        if (isBase64(substr)) {
            // V2ray to V2ray
            return createResponse(substr, 200, {}, 'application/json');
        } else {
            // Clash to V2ray
            const v2rayConfig = convertClashToV2ray(substr);
            return createResponse(v2rayConfig, 200, {}, 'application/json');
        }
    }

    
  
    return createResponse('Invalid target', 400);
  }

