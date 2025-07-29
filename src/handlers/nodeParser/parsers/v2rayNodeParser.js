import { SUPPORTED_PROTOCOLS } from '../../../features/UnifiedNode.js';
import { isBase64, safeAtob } from '../../../features/base64.js';

/**
 * 从 URLSearchParams 构建 TLS 配置对象
 * @param {URLSearchParams} params - URL 搜索参数
 * @param {string} defaultSni - 默认的 SNI
 * @returns {object} TLS 配置
 */
function buildTlsConfig(params, defaultSni) {
  const security = params.get('security');
  const isTls = security === 'tls';
  const isReality = security === 'reality';

  return {
    enabled: isTls || isReality,
    type: security || '', // 'tls', 'reality', or ''
    sni: params.get('sni') || defaultSni,
    alpn: params.get('alpn')?.split(',') || [],
    fp: params.get('fp') || 'random',
    allowInsecure: ['1', 'true'].includes(params.get('allowInsecure')) || ['1', 'true'].includes(params.get('insecure')),
    ...(isReality && {
      reality: {
        publicKey: params.get('pbk') || '',
        shortId: params.get('sid') || '',
      },
    }),
  };
}

/**
 * 从 URLSearchParams 构建网络配置对象
 * @param {URLSearchParams} params - URL 搜索参数
 * @returns {object} 网络配置
 */
function buildNetworkConfig(params) {
  const host = params.get('host') || '';
  const path = params.get('path') || '/';
  return {
    type: params.get('type') || 'tcp',
    ws: {
      path: params.get('path') || '',
      headers: host ? { Host: host } : {},
    },
    h2: {
      host,
      path,
    },
    grpc: {
      serviceName: params.get('serviceName') || params.get('path') || '',
      type: params.get('mode') === 'multi' ? 'multi' : 'gun',
    },
  };
}


// --- 各协议的具体解析器 ---

function parseVmess(node) {
  try {
    const base64Str = node.substring('vmess://'.length);
    if (!isBase64(base64Str)) return null;

    const jsonStr = safeAtob(base64Str);
    const config = JSON.parse(jsonStr);

    if (!config.add || !config.port || !config.id) return null;

    return {
      type: 'vmess',
      name: config.ps || 'Unnamed',
      server: config.add,
      port: Number(config.port),
      uuid: config.id,
      cipher: config.scy || 'auto',
      alterId: config.aid || 0,
      tls: {
        enabled: !!config.tls,
        type: config.tls || '',
        serverName: config.sni || config.add,
        allowInsecure: false,
        alpn: config.alpn?.split(',') || [],
        fingerprint: config.fp || 'random',
      },
      network: {
        type: config.net || 'tcp',
        ws: {
          path: config.path || '',
          headers: config.host ? { Host: config.host } : {},
        },
        h2: {
          host: config.host || '',
          path: config.path || '',
        },
        grpc: {
          gRPCtype: config.type || 'gun', // vmess json 'type' is for grpc mode
          host: config.host || '',
          path: config.path || '/',
        },
      },
    };
  } catch (error) {
    console.error(`Failed to parse Vmess node: ${error.message}`);
    return null;
  }
}

function parseVlessOrTrojan(node, protocol) {
  try {
    const url = new URL(node);
    const params = url.searchParams;

    if (!url.username || !url.hostname || !url.port) return null;

    return {
      type: protocol,
      name: url.hash ? decodeURIComponent(url.hash.substring(1)) : 'Unnamed',
      server: url.hostname,
      port: Number(url.port),
      udp: false,
      tfo: false,
      // VLESS and Trojan have different fields for authentication
      ...(protocol === 'vless' && { uuid: url.username, flow: params.get('flow') || '' }),
      ...(protocol === 'trojan' && { password: url.username }),
      tls: buildTlsConfig(params, url.hostname),
      network: buildNetworkConfig(params),
    };
  } catch (error) {
    console.error(`Failed to parse ${protocol} node: ${error.message}`);
    return null;
  }
}

function parseSS(node) {
  try {
    const url = new URL(node);
    // Standard: ss://<base64(method:password)>@server:port#name
    const userInfo = safeAtob(url.username);
    const [method, password] = userInfo.split(':');

    if (!method || !password || !url.hostname || !url.port) return null;

    return {
      type: 'ss',
      name: url.hash ? decodeURIComponent(url.hash.substring(1)) : 'Unnamed',
      server: url.hostname,
      port: Number(url.port),
      cipher: method,
      password: password,
    };
  } catch (error) {
    console.error(`Failed to parse SS node: ${error.message}`);
    return null;
  }
}

function parseHysteria2(node) {
  try {
    const url = new URL(node);
    const params = url.searchParams;

    if (!url.username || !url.hostname || !url.port) return null;

    const commonTlsParams = buildTlsConfig(params, url.hostname);

    const parsedNode = {
      type: 'hysteria2',
      name: url.hash ? decodeURIComponent(url.hash.substring(1)) : 'Unnamed',
      server: url.hostname,
      port: Number(url.port),
      password: url.username,
      // Hy2 特有字段
      ports: params.get('mport') || '',
      up: Number(params.get('up')) || 0,
      down: Number(params.get('down')) || 0,
      obfs: {
        type: params.get('obfs') || 'none',
        obfsPassword: params.get('obfs-password') || '',
      },
      tls: {
        ...commonTlsParams,
        enabled: true,
        type: 'tls',
      },
      udp: true,
      tfo: false,
    };
    return parsedNode;

  } catch (error) {
    console.error(`Failed to parse Hysteria2 node: ${error.message}`);
    return null;
  }
}

function parseSocks(node) {
  try {
    const url = new URL(node);
    const params = url.searchParams;

    if (!url.username || !url.hostname || !url.port) return null;

    return {
      type: 'socks',
      name: url.hash ? decodeURIComponent(url.hash.substring(1)) : 'Unnamed',
      server: url.hostname,
      port: Number(url.port),
      username: url.username,
      password: url.password,
    };
  } catch (error) {
    console.error(`Failed to parse Socks node: ${error.message}`);
    return null;
  }
}

function parseTuic(node) {
  try {
    const url = new URL(node);
    const params = url.searchParams;

    // TUIC v5 的认证信息在 userInfo 中，格式为 uuid:password
    const [uuid, password] = url.username.split(':');

    if (!uuid || !url.hostname || !url.port) return null;

    const commonTlsParams = buildTlsConfig(params, url.hostname);

    const parsedNode = {
      type: 'tuic',
      name: url.hash ? decodeURIComponent(url.hash.substring(1)) : 'Unnamed',
      server: url.hostname,
      port: Number(url.port),
      uuid: uuid,
      password: password || '',
      // TUIC 特有字段
      congestionController: params.get('congestion_control') || 'bbr',
      udpRelayMode: params.get('udp_relay_mode') || 'native',
      heartbeat: Number(params.get('heartbeat')) || 10000,
      tls: {
        ...commonTlsParams,
        enabled: true,
        type: 'tls',
      },
      udp: true,
      tfo: false,
    };
    return parsedNode;

  } catch (error) {
    console.error(`Failed to parse TUIC node: ${error.message}`);
    return null;
  }
}


// --- 解析器注册表 (Parser Registry) ---
const parsers = {
  'vmess': parseVmess,
  'vless': (node) => parseVlessOrTrojan(node, 'vless'),
  'trojan': (node) => parseVlessOrTrojan(node, 'trojan'),
  'ss': parseSS,
  'hysteria2': parseHysteria2,
  'socks': parseSocks,
  'tuic': parseTuic,
};

/**
 * 解析单个分享链接。
 * @param {string} nodeLink - 单个分享链接
 * @returns {object | null} - 解析后的通用节点对象，或在失败时返回 null
 */
function parseNode(nodeLink) {
  const protocol = nodeLink.split('://')[0];
  const parser = parsers[protocol];

  if (parser) {
    return parser(nodeLink);
  }

  return null;
}

/**
 * 解析 V2Ray 节点数组。
 * @param {string} v2rayNodes - V2Ray 分享链接字符串 (每个一行)
 * @returns {object[]} - 解析后的通用节点对象数组
 */
export default function parseV2rayNodes(v2rayNodes) {
  if (typeof v2rayNodes !== 'string') {
    return [];
  }
  const lines = v2rayNodes
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line && SUPPORTED_PROTOCOLS.some(proto => line.startsWith(`${proto}://`)));

  const parsedNodes = lines
    .map(parseNode)
    .filter(Boolean);

  return {
    nodes: parsedNodes,
    nodeCounter: lines.length,
    convertCounter: parsedNodes.length,
  };
}