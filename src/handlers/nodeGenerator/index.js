import * as Responses from '../../utils/response.js';
// import generateClash from './generators/clashGenerator.js';
import v2rayGenerator from './generators/v2rayGenerator.js';

const generatorRegistry = {
  // clash: generateClash,
  v2ray: v2rayGenerator,
};

/**
 * 主生成处理器
 * 根据订阅类型，从注册表中查找并调用相应的生成器。
 * @param {object[]} nodes - 通用节点对象数组
 * @param {string} targetType - 目标订阅类型 (e.g., 'clash', 'v2ray')
 * @returns {string} - 生成的订阅节点
 */
export default function handleGenerateSub(nodes, targetType) {
    const generator = generatorRegistry[targetType];

    if (!generator) {
        return Responses.subErr(`Unsupported target type: ${targetType}`);
    }

    return generator(nodes);
}