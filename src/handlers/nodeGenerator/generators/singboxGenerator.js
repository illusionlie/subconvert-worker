/**
 * Sing-box 基础配置
 */
const BASE_CONFIG = {
  "log": {
    "disabled": false,
    "level": "info",
    "timestamp": true
  },
  "dns": {
    "servers": [
      { "address": "https://223.5.5.5/dns-query" },
      { "address": "https://1.1.1.1/dns-query" }
    ]
  },
  "inbounds": [
    {
      "type": "mixed",
      "tag": "mixed-in",
      "listen": "127.0.0.1",
      "listen_port": 1080
    }
  ],
  "outbounds": [],
  "route": {
    "rules": [
      {
        "protocol": "dns",
        "outbound": "dns-out"
      },
      {
        "network": "lan",
        "outbound": "direct"
      }
    ]
  }
};

/**
 * 根据统一节点对象生成 Sing-box 出站配置
 * @param {object} node - 通用节点对象
 * @returns {object|null} - 生成的 Sing-box 出站对象, 或在无效时返回 null
 */
function generateSingboxOutbound(node) {
  if (!node || !node.name || !node.server || !node.port || !node.type) {
    return null;
  }

  const outbound = {
    "type": node.type,
    "tag": node.name,
    "server": node.server,
    "server_port": node.port,
    "udp": node.udp ?? false,
    "tfo": node.tfo ?? false,
    "mptcp": node.mptcp ?? false,
  };

  if (node.tls?.enabled) {
    outbound.tls = {
      "enabled": true,
      "server_name": node.tls.sni || node.server,
      "insecure": node.tls.allowInsecure ?? false,
      "alpn": node.tls.alpn ?? [],
      "utls": {
        "enabled": true,
        "fingerprint": node.tls.fingerprint ?? 'chrome',
      }
    };
    if (node.tls.reality?.enabled) {
      outbound.tls.reality = {
        "enabled": true,
        "public_key": node.tls.reality.publicKey,
        "short_id": node.tls.reality.shortId ?? '',
      };
    }
  }

  if (node.network?.type) {
    switch (node.network.type) {
      case 'ws':
        outbound.transport = {
          "type": "ws",
          "path": node.network.ws?.path ?? '/',
          "headers": node.network.ws?.headers ?? { "Host": outbound.tls?.server_name ?? node.server },
        };
        break;
      case 'h2':
        outbound.transport = {
          "type": "http",
          "host": [outbound.tls?.server_name ?? node.server],
          "path": node.network.h2?.path ?? '/',
        };
        break;
      case 'grpc':
        outbound.transport = {
          "type": "grpc",
          "service_name": node.network.grpc?.serviceName ?? '',
        };
        break;
    }
  }

  switch (node.type) {
    case 'vmess':
      outbound.uuid = node.uuid;
      outbound.alter_id = node.alterId ?? 0;
      outbound.security = node.cipher ?? 'auto';
      outbound.packet_encoding = node.packetEncoding || '';
      outbound.global_padding = node.globalPadding ?? false;
      outbound.authenticated_length = node.authenticatedLength ?? false;
      break;
    case 'vless':
      outbound.uuid = node.uuid;
      outbound.flow = node.flow ?? '';
      outbound.packet_encoding = node.packetEncoding ?? 'xudp';
      break;
    case 'trojan':
      outbound.password = node.password;
      break;
    case 'ss':
      outbound.method = node.cipher;
      outbound.password = node.password;
      break;
    case 'hysteria2':
      outbound.password = node.password;
      outbound.up_mbps = node.up ?? 0;
      outbound.down_mbps = node.down ?? 0;
      if(node.obfs) {
        outbound.obfs = {
          "type": node.obfs?.type ?? '',
          "password": node.obfs?.password ?? '',
        }
      }
      break;
    case 'tuic':
      outbound.uuid = node.uuid;
      outbound.password = node.password;
      outbound.congestion_control = node.congestionController ?? 'bbr';
      outbound.udp_relay_mode = node.udpRelayMode ?? 'native';
      outbound.alpn = node.tls.alpn ?? ['h3'];
      break;
  }

  return outbound;
}

/**
 * 生成完整的 Sing-box 订阅配置
 * @param {object[]} unifiedNodes - 通用节点对象数组
 * @param {object} [options={}] - (可选) 自定义选项
 * @returns {string} - JSON 格式的 Sing-box 配置字符串
 */
export default function singboxGenerator(unifiedNodes, options = {}) {
  if (!Array.isArray(unifiedNodes) || unifiedNodes.length === 0) {
    return "";
  }

  const outbounds = unifiedNodes.map(generateSingboxOutbound).filter(Boolean);
  if (outbounds.length === 0) {
    return "";
  }

  const finalConfig = { ...BASE_CONFIG };
  finalConfig.outbounds = [
    ...outbounds,
    { "type": "direct", "tag": "direct" },
    { "type": "block", "tag": "block" },
    { "type": "dns", "tag": "dns-out" }
  ];

  const nodeTags = outbounds.map(n => n.tag);

  finalConfig.outbounds.push(
    {
      "type": "selector",
      "tag": "PROXY",
      "outbounds": ["AUTO", ...nodeTags],
      "default": "AUTO"
    },
    {
      "type": "urltest",
      "tag": "AUTO",
      "outbounds": nodeTags,
      "url": "http://www.gstatic.com/generate_204"
    }
  );

  finalConfig.route.rules.push({
    "outbound": "PROXY",
    "inbound": ["mixed-in"]
  });

  return JSON.stringify(finalConfig, null, 2);
}
