import * as Responses from '../../utils/response.js';
import parseClash from './parsers/clashParser';
import parseV2ray from './parsers/v2rayParser';
import parseSingbox from './parsers/singboxParser';

const parserRegistry = {
  clash: parseClash,
  v2ray: parseV2ray,
  'sing-box': parseSingbox,
};

/**
 * 主解析处理器
 * 根据订阅类型，从注册表中查找并调用相应的解析器。
 * @param {string} subStr - 订阅原始内容
 * @param {string} subType - 识别出的订阅类型 (e.g., 'clash', 'v2ray')
 * @returns {Array<string|object>} - 解析出的节点数组。可能是字符串，也可能是对象。
 */
export default function handleSubParse(subStr, subType) {
  const parser = parserRegistry[subType];

  if (!parser) {
    throw new Error(`Unsupported subscription type: ${subType}`);
  }

  return parser(subStr);
}