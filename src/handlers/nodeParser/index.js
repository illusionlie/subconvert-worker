import * as Responses from '../../utils/response.js';
import parseClashNode from './parsers/clashNodeParser.js';
import parseV2rayNode from './parsers/v2rayNodeParser';
// import parseSingboxNode from './parsers/singboxNodeParser';

const parserNodeRegistry = {
  clash: parseClashNode,
  v2ray: parseV2rayNode,
  // 'sing-box': parseSingboxNode,
};

/**
 * 主解析处理器
 * 根据订阅类型，从注册表中查找并调用相应的解析器。
 * @param {string} subStr - 订阅原始内容
 * @param {string} subType - 识别出的订阅类型 (e.g., 'clash', 'v2ray')
 * @returns {Array<string|object>} - 解析出的节点数组。可能是字符串，也可能是对象。
 */
export default function handleNodeParse(subStr, subType) {
  const parser = parserNodeRegistry[subType];

  if (!parser) {
    return Responses.subErr(`Unsupported subscription type: ${subType}`);
  }

  return parser(subStr);
}

