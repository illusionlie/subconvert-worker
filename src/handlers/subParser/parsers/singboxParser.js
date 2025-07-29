import { SUPPORTED_PROTOCOLS } from '../../../features/UnifiedNode.js';
import z from 'zod';
  
const schema = z.object({
  outbounds: z.array(
    z.object({
      type: z.string(),
      tag: z.string(),
    }).catchall(z.unknown())
  ),
}).catchall(z.unknown());

/**
 * 解析 Sing-box 订阅 (JSON 格式)。
 * @param {string} subStr - 订阅原始内容 (JSON 字符串)
 * @returns {object[]} - Sing-box proxy 对象数组
 */
export default function parseSingbox(subStr) {
  let config;

  try {
    config = JSON.parse(subStr);
  } catch (err) {
    throw new Error('Failed to parse subscription content: ' + err);
  }

  const result = schema.safeParse(config);
  if (!result.success) {
    throw new Error(`Subscription schema validation failed: ${result.error.errors.map(e => `${e.path.join('.')} ${e.message}`).join(', ')}`);
  }

  const parsedConfig = result.data.outbounds;
  return parsedConfig.filter(outbound => SUPPORTED_PROTOCOLS.has(outbound.type));
}