import YAML from 'js-yaml';

/**
 * 生成 Clash 订阅
 * @param {object[]} unifiedNodes - 通用节点对象数组
 * @returns {string} - 生成的 Clash 节点
 */
export default function clashGenerator(unifiedNodes, options = {}) {
  if (!Array.isArray(unifiedNodes) || unifiedNodes.length === 0) {
    return "";
  }
  const proxies = unifiedNodes
    .map(generateNode)
    .filter(Boolean);

  // 基础配置
  const baseConfig = {
    port: 7890,
    'socks-port': 7891,
    'mixed-port': 10801, // HTTP(S) 和 SOCKS 代理混合端口
    'redir-port': 7892, // 透明代理端口，用于 Linux 和 MacOS
    'allow-lan': false,
    mode: 'rule',
    'log-level': 'info',
  };

  // GEO数据配置
  const geoConfig = {
    'geodata-mode': true,
    'geodata-loader': 'standard',
    'geo-auto-update': true,
    'geo-update-interval': 24,
    'geox-url': {
      'geoip': 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat',
      'geosite': 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat',
      'mmdb': 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/country.mmdb',
      'asn': 'https://github.com/xishang0128/geoip/releases/download/latest/GeoLite2-ASN.mmdb'
    }
  };

  const dnsConfig = {
    'dns': {
      'enable': true,
      'listen': '0.0.0.0:53',
      'enhanced-mode': 'fake-ip',
      'respect-rules': true,
      'default-nameserver': [
        'https://dns.cloudflare.com/dns-query',
        'https://120.53.53.53/dns-query',
        'https://223.5.5.5/dns-query'
      ],
      'nameserver': [
        'https://dns.google/dns-query',
        'https://dns.cloudflare.com/dns-query',
        'https://secure.cloudflare-gateway.com/dns-query',
      ],
      'nameserver-policy': {
        'geosite:cn,private': [
            'https://120.53.53.53/dns-query',
            'https://223.5.5.5/dns-query'
        ],
        'geosite:geolocation-!cn': [
            'https://dns.cloudflare.com/dns-query',
            'https://secure.cloudflare-gateway.com/dns-query',
            'https://dns.google/dns-query'
        ]
      },
      'fallback': [
        'https://120.53.53.53/dns-query',
        'https://223.5.5.5/dns-query',
        'https://120.53.53.53/dns-query',
        'https://223.5.5.5/dns-query'
      ],
      'fake-ip-range': '198.18.0.1/16',
      'fake-ip-filter': [
        'geolocation-cn',
        'private'
      ]
    }
  };

  const proxyGroups = [
    // TODO
  ];
  
  const ruleProviders = {
    // TODO
  };

  const rules = [
    // TODO
  ];

  const finalConfig = { ...baseConfig, ...geoConfig, ...dnsConfig, proxies, 'proxy-groups': proxyGroups, 'rule-providers': ruleProviders, 'rules': rules };
  return yamlContent;
}

function generateNode(node) {
  const clashNode = {
    name: node.name,
    server: node.server,
    port: node.port,
    type: node.type,
    udp: node.udp ?? false,
    tfo: node.tfo ?? false,
    mptcp: node.mptcp ?? false,
  };
  // TLS 配置
  if (node.tls?.enabled) {
    clashNode.tls = true;
    // VLESS、VMess 使用 servername，其他协议使用 sni (https://wiki.metacubex.one/config/proxies/tls/)
    if (node.type === 'vless' || node.type === 'vmess') {
      clashNode.servername = node.tls.sni || node.server;
    } else {
      clashNode.sni = node.tls.sni || node.server;
    }
    clashNode.alpn = node.tls.alpn ?? [];
    clashNode['skip-cert-verify'] = node.tls.allowInsecure ?? false;
    clashNode['client-fingerprint'] = node.tls.fingerprint ?? 'chrome';
    if (node.tls.reality) {
      clashNode['reality-opts'] = {
        'public-key': node.tls.reality.publicKey,
        'short-id': node.tls.reality.shortId,
      };
    }
  }
  // 传输层配置
  if (node.network?.type) {
    clashNode.network = node.network.type;
    switch (node.network.type) {
      case 'ws':
        clashNode['ws-opts'] = {
          path: node.network.ws?.path ?? '/',
          headers: node.network.ws?.headers ?? { Host: node.server },
        };
        break;
      case 'h2':
        clashNode['h2-opts'] = {
          host: node.network.h2?.host ?? [node.server],
          path: node.network.h2?.path ?? '/',
        };
        break;
      case 'grpc':
        clashNode['grpc-opts'] = {
          'grpc-service-name': node.network.grpc?.serviceName ?? '',
        };
        break;
    }
  }
  switch (node.type) {
    case 'vmess':
      clashNode.uuid = node.uuid;
      clashNode.alterId = node.alterId || 0;
      clashNode.cipher = node.cipher || 'auto';
      clashNode['packet-encoding'] = node.packetEncoding || '';
      clashNode['global-padding'] = node.globalPadding ?? false;
      clashNode['authenticated-length'] = node.authenticatedLength ?? false;
      break;
    case 'vless':
      clashNode.uuid = node.uuid;
      clashNode.flow = node.flow ?? '';
      clashNode['packet-encoding'] = node.packetEncoding || 'none';
      break;
    case 'trojan':
      clashNode.password = node.password;
      break;
    case 'ss':
      clashNode.cipher = node.cipher;
      clashNode.password = node.password;
      break;
    case 'hysteria2':
      clashNode.password = node.password;
      clashNode['up'] = node.up ?? 0;
      clashNode['down'] = node.down ?? 0;
      clashNode['obfs'] = node.obfs?.type ?? '';
      clashNode['obfs-password'] = node.obfs?.password ?? '';
      break;
    case 'tuic':
      clashNode.uuid = node.uuid;
      clashNode.password = node.password;
      clashNode['heartbeat-interval'] = node.heartbeatInterval ?? 0;
      clashNode['udp-relay-mode'] = node.udpRelayMode ?? 'native';
      clashNode['congestion-controller'] = node.congestionController ?? 'bbr';
      break;
    case 'socks':
      clashNode.username = node.username ?? '';
      clashNode.password = node.password ?? '';
      break;
  }
  return clashNode;
}