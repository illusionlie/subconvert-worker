/**
 * 在一个范围内生成一个随机整数。
 * @param {number} min - 最小值。
 * @param {number} max - 最大值。
 * @returns {number}
 */
export function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}