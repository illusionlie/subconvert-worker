/**
 * 检测字符串是否为Base64编码。
 * @param {string} str - 要检测的字符串。
 * @returns {boolean} 
 */
export function isBase64(str) {
  if (typeof str !== 'string') return false;
  const s = str.replace(/\s+/g, '');
  if (s.length === 0 || s.length % 4 !== 0) return false;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return false;

  try {
    const bin = atob(s);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    // 遇到非法 UTF‑8 抛错
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }

}

/**
 * 将字符串安全地编码为Base64。
 * @param {string} str - 要编码的字符串。
 * @returns {string}
 */
export function safeBtoa(str) {
  const utf8Bytes = new TextEncoder().encode(str);
  const binaryString = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
  return btoa(binaryString);
}

/**
 * 将Base64字符串安全地解码为字符串。
 * @param {string} str - 要解码的Base64字符串。
 * @returns {string}
 */
export function safeAtob(str) {
  const binaryString = atob(str);
  const utf8Bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
  return new TextDecoder().decode(utf8Bytes);
}