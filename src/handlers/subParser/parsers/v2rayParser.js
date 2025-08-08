import { safeAtob } from '../../../features/base64.js';
import { V2RAY_SCHEMES } from '../../../features/UnifiedNode.js';
import z from 'zod/v4';

const schema = z.string().refine(
  (link) => V2RAY_SCHEMES.some(proto => link.startsWith(proto)));

/**
 * 解析基于 Base64 编码的订阅，每行一个节点。
 * @param {string} subStr - 订阅原始内容
 * @returns {string[]} - 节点链接数组
 */
export default function parseV2ray(subStr) {
  const rawSubValidation = (z.string().min(1)).safeParse(subStr);
  if (!rawSubValidation.success) {
    throw new Error(`Subscription schema validation failed: ${rawSubValidation.error.errors.map(e => `${e.path.join('.')} ${e.message}`).join(', ')}`);
  }
  
  let config;

  try {
    config = safeAtob(subStr);
    if (!config) {
      throw new Error('Failed to decode subscription content');
    }
  } catch (err) {
    throw new Error('Failed to parse subscription content: ' + err);
  }

  const lines = config
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map(line => line.trim())
    .flatMap(line => {
      const result = schema.safeParse(line);
      return result.success ? [result.data] : [];
  });

  return lines;
}