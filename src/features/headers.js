import { getRandom } from '../utils/tools.js';

/**
 * 生成一个伪造的请求头对象。
 * @returns {Headers}
 */
export function generateBrowserHeaders(ua) {
  const browserProfiles = [
    {
      name: "Windows 10 - Chrome",
      weight: 45,
      uaTemplate: () => {
        const platform = Math.random() < 0.5 ? "Win64; x64" : "WOW64";
        const chromeVersion = `${getRandom(124, 126)}.0.${getRandom(6300, 6400)}.${getRandom(50, 150)}`;
        return `Mozilla/5.0 (Windows NT 10.0; ${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
      },
    },
    {
      name: "Windows 10 - Edge",
      weight: 20,
      uaTemplate: () => {
        const platform = Math.random() < 0.5 ? "Win64; x64" : "WOW64";
        const edgeVersion = `${getRandom(124, 126)}.0.${getRandom(2400, 2500)}.${getRandom(50, 100)}`;
        return `Mozilla/5.0 (Windows NT 10.0; ${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${edgeVersion} Safari/537.36 Edg/${edgeVersion}`;
      },
    },
    {
      name: "Windows 10 - Firefox",
      weight: 15,
      uaTemplate: () => {
        const platform = Math.random() < 0.5 ? "Win64; x64" : "WOW64";
        const firefoxVersion = `${getRandom(125, 127)}.0`;
        // ESR (Extended Support Release) 版本的出现概率较低
        const isESR = Math.random() < 0.3 ? "esr" : "";
        return `Mozilla/5.0 (Windows NT 10.0; ${platform}; rv:${firefoxVersion}) Gecko/20100101 Firefox/${firefoxVersion}${isESR}`;
      },
    },
    {
      name: "macOS - Safari",
      weight: 15,
      uaTemplate: () => {
        const macVersion = `10_15_${getRandom(5, 7)}`;
        const webkitVersion = `${getRandom(605, 615)}.${getRandom(1, 3)}.${getRandom(1, 40)}`;
        const safariVersion = `${getRandom(15, 17)}.${getRandom(0, 5)}`;
        return `Mozilla/5.0 (Macintosh; Intel Mac OS X ${macVersion}) AppleWebKit/${webkitVersion} (KHTML, like Gecko) Version/${safariVersion} Safari/${webkitVersion}`;
      },
    },
    {
      name: "macOS - Chrome",
      weight: 5,
      uaTemplate: () => {
        const macVersion = `10_15_${getRandom(5, 7)}`;
        const chromeVersion = `${getRandom(124, 126)}.0.${getRandom(6300, 6400)}.${getRandom(50, 150)}`;
        return `Mozilla/5.0 (Macintosh; Intel Mac OS X ${macVersion}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
      },
    },
  ];

  let UA;

  // 浏览器 UA
  if (ua === 'browser') {
    // 计算总权重
    const totalWeight = browserProfiles.reduce((sum, profile) => sum + profile.weight, 0);
    let randomWeight = Math.random() * totalWeight;

    for (const profile of browserProfiles) {
      if (randomWeight < profile.weight) {
        UA = profile.uaTemplate();
      }
      randomWeight -= profile.weight;
    }
  } else if (ua === 'default') {
    // 默认 UA
    UA = 'subconvert-worker/0.2.0 (+https://github.com/illusionlie/subconvert-worker)';
  } else {
    UA = ua;
  }

  let requestHeaders = new Headers();

  const removedHeaders = ["x-real-ip", "x-forwarded-for", "cf-connecting-ip", "cf-visitor", "cf-ipcountry", "cf-ray", "cf-request-id", "cf-visitor", "cf-Connecting-IP", "X-Forwarded-For", "X-Forwarded-Host", "X-Forwarded-Proto", "X-Forwarded-Server", "X-Real-IP", "X-Real-Port"];
  removedHeaders.forEach(header => {
    if (requestHeaders.has(header)) {
      requestHeaders.delete(header);
    }
  });

  const browserHeaders = {
    'User-Agent': UA,
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
    'Priority': 'u=0',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-User': '?1',
    'Referer': 'https://www.google.com/',
    'DNT': '1',
    'Sec-Gpc': '1',
    "x-real-ip": "127.0.0.1",
    "X-Forwarded-For": "127.0.0.1"
  };

  Object.entries(browserHeaders).forEach(([header, value]) => {
    requestHeaders.set(header, value);
  });

  return requestHeaders;
}