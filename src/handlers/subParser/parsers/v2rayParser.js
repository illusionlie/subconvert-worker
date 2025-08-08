import { safeAtob } from '../../../features/base64.js';
import { V2RAY_SCHEMES } from '../../../features/UnifiedNode.js';
import z from 'zod/v4';

const schema = z.string().refine(
  (link) => V2RAY_SCHEMES.some(proto => link.startsWith(proto)));

/**
 * 解析 V2ray 分享链接的订阅，每行一个节点。
 * @param {string} subStr - 订阅原始内容
 * @returns {string[]} - 节点链接数组
 */
export default function parseV2ray(subStr) {
  const rawSubValidation = (z.string().min(1)).safeParse(subStr);
  if (!rawSubValidation.success) {
    throw new Error(`Failed to parse subscription content: Not a string`);
  }

  const lines = subStr
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map(line => line.trim())
    .flatMap(line => {
      const result = schema.safeParse(line);
      return result.success ? [result.data] : [];
  });

  return lines;
}