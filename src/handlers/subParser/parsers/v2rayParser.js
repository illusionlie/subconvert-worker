/**
 * 解析基于 Base64 编码的订阅，每行一个节点。
 * 适用于 V2Ray, SS, SSR, Trojan 等。
 * @param {string} subStr - 订阅原始内容
 * @returns {string[]} - 节点链接数组
 */
export default function parseV2ray(subStr) {
    try {
      const decodedStr = atob(subStr);
      // 通过换行符分割，并过滤掉空行或无效行
      return decodedStr.split(/\r?\n/).filter(line => line.trim() !== '');
    } catch (err) {
      console.error('Failed to parse V2ray/Base64 subscription:', err);
      return [];
    }
  }