import YAML from 'js-yaml';

/**
 * Clash 基础配置
 */
const BASE_CONFIG = {
  'port': 7890,
  'socks-port': 7891,
  'mixed-port': 10801,
  'redir-port': 7892,
  'allow-lan': false,
  'mode': 'rule',
  'log-level': 'info',
  'external-controller': '127.0.0.1:9090',
};

/**
 * GEO 数据相关配置
 */
const GEO_CONFIG = {
  'geodata-mode': true,
  'geo-auto-update': true,
  'geo-update-interval': 24,
  'geox-url': {
    'geoip': 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat',
    'geosite': 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat',
    'mmdb': 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/country.mmdb',
  },
};

/**
 * DNS 相关配置
 */
const DNS_CONFIG = {
  'dns': {
    'enable': true,
    'listen': '0.0.0.0:53',
    'enhanced-mode': 'fake-ip',
    'fake-ip-range': '198.18.0.1/16',
    'default-nameserver': [
      '223.5.5.5',
      '119.29.29.29',
    ],
    'nameserver': [
      'https://dns.cloudflare.com/dns-query',
      'https://dns.google/dns-query',
      'https://secure.cloudflare-gateway.com/dns-query',
    ],
    'fallback': [
      'https://dns.twnic.tw/dns-query',
      'https://120.53.53.53/dns-query',
      'https://223.5.5.5/dns-query',
    ],
    'nameserver-policy': {
      'geosite:cn,private': [
        'https://120.53.53.53/dns-query',
        'https://223.5.5.5/dns-query'
      ],
    },
    'fake-ip-filter': [
      '*.lan',
      'localhost.localdomain',
      '*.local',
      'geosite:cn',
      'geosite:private',
    ],
  },
};

/**
 * 根据统一节点对象生成 Clash 节点配置
 * @param {object} node - 通用节点对象
 * @returns {object|null} - 生成的 Clash 节点对象, 或在无效时返回 null
 */
function generateClashNode(node) {
  if (!node || !node.name || !node.server || !node.port || !node.type) {
    return null;
  }

  const clashNode = {
    name: node.name,
    server: node.server,
    port: node.port,
    type: node.type,
    udp: node.udp ?? false,
    tfo: node.tfo ?? false,
    mptcp: node.mptcp ?? false,
  };

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
        'short-id': node.tls.reality.shortId ?? '',
      };
    }
  }

  if (node.network?.type) {
    clashNode.network = node.network.type;
    switch (node.network.type) {
      case 'ws':
        clashNode['ws-opts'] = {
          path: node.network.ws?.path ?? '/',
          headers: node.network.ws?.headers ?? { Host: clashNode.sni ?? clashNode.servername ?? node.server },
        };
        break;
      case 'h2':
        clashNode['h2-opts'] = {
          host: [clashNode.servername ?? node.server],
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
      clashNode.alterId = node.alterId ?? 0;
      clashNode.cipher = node.cipher ?? 'auto';
      clashNode['packet-encoding'] = node.packetEncoding || '';
      clashNode['global-padding'] = node.globalPadding ?? false;
      clashNode['authenticated-length'] = node.authenticatedLength ?? false;
      break;
    case 'vless':
      clashNode.uuid = node.uuid;
      clashNode.flow = node.flow ?? '';
      clashNode['packet-encoding'] = node.packetEncoding ?? 'xudp';
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
      clashNode.up = node.up ?? 0;
      clashNode.down = node.down ?? 0;
      clashNode.obfs = node.obfs?.type ?? '';
      clashNode['obfs-password'] = node.obfs?.password ?? '';
      break;
    case 'tuic':
      clashNode.uuid = node.uuid;
      clashNode.password = node.password;
      clashNode['heartbeat-interval'] = node.heartbeatInterval ?? 0;
      clashNode['udp-relay-mode'] = node.udpRelayMode ?? 'native';
      clashNode['congestion-controller'] = node.congestionController ?? 'bbr';
      clashNode.alpn = node.tls.alpn ?? ['h3'];
      break;
  }

  return clashNode;
}

/**
 * 创建代理组 (Proxy Groups)
 * @param {string[]} nodeNames - 所有节点名称的数组
 * @returns {object[]} - Clash 代理组配置数组
 */
function createProxyGroups(nodeNames) {
  const proxy = ['自动选择', 'DIRECT', ...nodeNames];
  const domestic = ['DIRECT', 'REJECT'];
  const others = ['PROXY', 'DIRECT'];
  
  return [
    { name: 'PROXY', type: 'select', proxies: proxy },
    { name: '自动选择', type: 'url-test', proxies: nodeNames, url: 'http://www.gstatic.com/generate_204', interval: 300 },
    { name: '广告拦截', type: 'select', proxies: ['REJECT', 'DIRECT'] },
    { name: '国内网站', type: 'select', proxies: domestic },
    { name: '国际媒体', type: 'select', proxies: proxy },
    { name: 'Apple', type: 'select', proxies: others },
    { name: 'Telegram', type: 'select', proxies: proxy },
    { name: 'AI 服务', type: 'select', proxies: proxy },
    { name: 'Others', type: 'select', proxies: others },
  ];
}

/**
 * 创建规则提供者 (Rule Providers)
 * @returns {object} - Clash 规则提供者配置对象
 */
function createRuleProviders() {
  const rulePath = '/etc/clash/ruleset/';
  const baseRepo = 'https://testingcf.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/';

  const createProvider = (name, type, behavior) => ({
    type: 'http',
    behavior: behavior,
    url: `${baseRepo}${name}.txt`,
    path: `${rulePath}${name}.yaml`,
    interval: 86400,
  });

  return {
    'applications': createProvider('applications', 'http', 'domain'),
    'private': createProvider('private', 'http', 'domain'),
    'microsoft': createProvider('microsoft', 'http', 'domain'),
    'apple': createProvider('apple', 'http', 'domain'),
    'telegram': createProvider('telegram', 'http', 'ipcidr'),
    'ai': createProvider('ai', 'http', 'domain'),
    'ad': createProvider('reject', 'http', 'domain'),
    'lan': createProvider('lan', 'http', 'ipcidr'),
    'cn': createProvider('cn', 'http', 'ipcidr'),
    'gfw': createProvider('gfw', 'http', 'domain'),
    'tld-not-cn': createProvider('tld-not-cn', 'http', 'domain'),
    'stream': createProvider('stream', 'http', 'domain'),
  };
}


/**
 * 创建规则 (Rules)
 * @returns {string[]} - Clash 规则数组
 */
function createRules() {
  return [
    'RULE-SET,applications,DIRECT',
    'RULE-SET,private,DIRECT',
    'RULE-SET,reject,广告拦截',
    'RULE-SET,lan,国内网站',
    'RULE-SET,cn,国内网站',
    'RULE-SET,gfw,PROXY',
    'RULE-SET,tld-not-cn,PROXY',
    'RULE-SET,telegram,Telegram',
    'RULE-SET,stream,国际媒体',
    'RULE-SET,ai,AI 服务',
    'RULE-SET,apple,Apple',
    'RULE-SET,microsoft,DIRECT',
    'GEOIP,CN,国内网站',
    'MATCH,Others'
  ];
}

/**
 * 生成完整的 Clash (Mihomo/Meta) 订阅配置
 * @param {object[]} unifiedNodes - 通用节点对象数组
 * @param {object} [options={}] - (可选) 自定义选项
 * @returns {string} - YAML 格式的 Clash 配置字符串
 */
export default function clashGenerator(unifiedNodes, options = {}) {
  if (!Array.isArray(unifiedNodes) || unifiedNodes.length === 0) {
    return "";
  }

  const proxies = unifiedNodes.map(generateClashNode).filter(Boolean);
  if (proxies.length === 0) {
    return "";
  }

  const nodeNames = proxies.map(node => node.name);
  
  const proxyGroups = createProxyGroups(nodeNames);
  const ruleProviders = createRuleProviders();
  const rules = createRules();
  
  const finalConfig = {
    ...BASE_CONFIG,
    ...GEO_CONFIG,
    ...DNS_CONFIG,
    'proxies': proxies,
    'proxy-groups': proxyGroups,
    'rule-providers': ruleProviders,
    'rules': rules,
  };

  return YAML.dump(finalConfig, {
    skipInvalid: true, // 自动跳过无效值 (如 undefined)
    noRefs: true,      // 禁用 YAML 引用
    sortKeys: false,   // 保持原始 key 的顺序
  });
}