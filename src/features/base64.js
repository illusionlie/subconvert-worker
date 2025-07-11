/**
 * 检测字符串是否为Base64编码。
 * @param {string} str - 要检测的字符串。
 * @returns {boolean} 
 */
export function isBase64(str) {
    try {
        return safeBtoa(safeAtob(str)) == str;
    } catch (err) {
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