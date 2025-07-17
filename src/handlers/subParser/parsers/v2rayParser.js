import { safeAtob } from '../../../features/base64.js';
import z from 'zod';

const SUPPORTED_PROTOCOLS = [
  'vmess://',
  'vless://',
  'ss://',
  'trojan://',
  'socks://',
  'hysteria2://',
  'tuic://',
];

const schema = z.string().refine(
  (link) => SUPPORTED_PROTOCOLS.some(proto => link.startsWith(proto)));

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
    .map(line => line.trim())
    .flatMap(line => {
      const result = schema.safeParse(line);
      return result.success ? [result.data] : [];
  });

  return lines;
}