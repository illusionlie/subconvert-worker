import YAML from 'js-yaml';

/**
 * 解析 Clash 订阅 (YAML 格式)。
 * @param {string} subStr - 订阅原始内容 (YAML 字符串)
 * @returns {object[]} - Clash proxy 对象数组
 */
export default function parseClash(subStr) {
  try {
    const config = YAML.load(subStr);
    // Clash 的节点通常在 'proxies' 或 'proxy-groups' 字段下
    // TODO: 提取 'proxy-groups' 下的节点
    if (config && Array.isArray(config.proxies)) {
      return config.proxies;
    }
    return [];
  } catch (err) {
    console.error('Failed to parse Clash subscription:', err);
    return [];
  }
}