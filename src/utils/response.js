/**
 * 创建一个标准化的 Response 对象。
 * @param {string | ReadableStream | null} body - 响应体。
 * @param {number} status - HTTP 状态码。
 * @param {Object} headers - 自定义的响应头。
 * @param {string} contentType - Content-Type 的值。
 * @returns {Response}
 */
export function createResponse(body, status = 200, headers = {}, contentType = "text/html; charset=utf-8") {
    const responseHeaders = {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Resource-Policy": "cross-origin",
      ...headers
    };
    return new Response(body, { status, headers: responseHeaders });
  }