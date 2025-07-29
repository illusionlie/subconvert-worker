import { SUPPORTED_PROTOCOLS } from '../../../features/UnifiedNode.js';
import YAML from 'js-yaml';
import z from 'zod';

const schema = z.object({
  proxies: z.array(
    z.object({
      name: z.string(),
      server: z.string(),
      port: z.number(),
      type: z.string(),
    }).catchall(z.unknown())
  ),
}).catchall(z.unknown());

/**
 * 解析 Clash 订阅 (YAML 格式)。
 * @param {string} subStr - 订阅原始内容 (YAML 字符串)
 * @returns {object[]} - Clash proxy 对象数组
 */
export default function parseClash(subStr) {
  let config;

  try {
    config = YAML.load(subStr);
  } catch (err) {
    throw new Error('Failed to parse Clash subscription: ' + err);
  }

  const result = schema.safeParse(config);
  if (!result.success) {
    throw new Error(`Subscription schema validation failed: ${result.error.errors.map(e => `${e.path.join('.')} ${e.message}`).join(', ')}`);
  }

  const filteredResult = result.data.proxies.filter(proxy =>
    SUPPORTED_PROTOCOLS.has(proxy.type)
  );

  return filteredResult;
}