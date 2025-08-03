import z from 'zod/v4';

/**
* TLS 配置 Schema
*/
const TlsSchema = z.discriminatedUnion('enabled', [
  z.object({
      enabled: z.literal(false),
  }),
  z.object({
      enabled: z.literal(true),
      serverName: z.string().optional().describe('SNI (Server Name Indication)'),
      allowInsecure: z.boolean().default(false).describe('是否允许不安全连接 (例如自签名证书)'),
      alpn: z.array(z.string()).optional().describe('应用层协议协商 (h2, http/1.1)'),
      fingerprint: z.enum(['chrome', 'firefox', 'safari', 'ios', 'random', 'randomized']).default('chrome').describe('TLS 指纹 (uTLS)'),
      // REALITY 配置
      reality: z.object({
          publicKey: z.string().describe('REALITY public key'),
          shortId: z.string().optional().describe('REALITY short-id'),
      }).optional().describe('REALITY 相关配置'),
  }),
])


/**
* 传输层网络配置 Schema
*/
const NetworkSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('tcp') }),
  z.object({ type: z.literal('udp') }),
  z.object({
      type: z.literal('ws'),
      path: z.string().default('/'),
      // headers: z.record(z.string()).optional().describe('WebSocket Headers, e.g., { "Host": "example.com" }'),
      headers: z.object({}).catchall(z.string()).optional().describe('WebSocket Headers, e.g., { "Host": "example.com" }'),
  }),
  z.object({
      type: z.literal('h2'),
      host: z.string().describe('HTTP/2 主机名/域名'),
      path: z.string().default('/'),
  }),
  z.object({
      type: z.literal('grpc'),
      serviceName: z.string().describe('gRPC Service Name'), // Clash、Sing-box
      gRPCtype: z.enum(['gun', 'multi']).default('gun').describe('gRPC 类型'),
  }),
])


/**
* 基础节点 Schema
*/
const BaseNodeSchema = z.object({
  name: z.string().describe('节点名称'),
  server: z.string().describe('服务器地址 (IP或域名)'),
  port: z.number().int().min(1).max(65535).describe('端口'),
  
  // 通用可选参数 (Clash, Sing-box)
  udp: z.boolean().default(false).describe('是否允许 UDP'),
  tfo: z.boolean().default(false).describe('是否启用 TCP Fast Open'),
  mptcp: z.boolean().default(false).describe('是否启用 TCP Multi Path'),

  // 嵌套的复杂配置
  tls: TlsSchema.optional().default({ enabled: false }),
  network: NetworkSchema.optional().default({ type: 'tcp' }),
});


// =================================================================
// 各协议的具体 Schema 定义
// 每个都继承自 BaseNodeSchema，并添加自己的独特字段
// =================================================================

const VmessNodeSchema = BaseNodeSchema.extend({
  type: z.literal('vmess'),
  uuid: z.string(),
  alterId: z.number().int().min(0).default(0),
  cipher: z.string().default('auto'),
  packetEncoding: z.enum(['xudp', 'packetaddr', 'none']).optional(),
  globalPadding: z.boolean().optional(),
  authenticatedLength: z.boolean().optional(),
});

const VlessNodeSchema = BaseNodeSchema.extend({
  type: z.literal('vless'),
  uuid: z.string(),
  flow: z.string().optional().describe('流控 (e.g., xtls-rprx-vision)'),
  packetEncoding: z.enum(['xudp', 'packetaddr', 'none']).optional(),
});

const TrojanNodeSchema = BaseNodeSchema.extend({
  type: z.literal('trojan'),
  password: z.string(),
});

const Hysteria2NodeSchema = BaseNodeSchema.extend({
  type: z.literal('hysteria2'),
  ports: z.string().describe('端口跳跃范围 (e.g., 1-100)'),
  password: z.string().describe('Hy2 认证密码'),
  up: z.number().int().min(0).default(0).describe('上行带宽限制 (单位: Mbps)'), // Clash、Sing-box
  down: z.number().int().min(0).default(0).describe('下行带宽限制 (单位: Mbps)'), // Clash、Sing-box
  obfs: z.object({
      type: z.enum(['salamander', 'none']).default('none'),
      password: z.string().optional(),
  }).optional(),
});

const ShadowsocksNodeSchema = BaseNodeSchema.extend({
  type: z.literal('ss'),
  cipher: z.string().describe('加密方式'),
  password: z.string().describe('密码'),
});

const TuicNodeSchema = BaseNodeSchema.extend({
  type: z.literal('tuic'),
  uuid: z.uuid().describe('在 TUIC v5 中是 uuid'),
  password: z.string().describe('在 TUIC v5 中是 password'),
  congestionController: z.enum(['cubic', 'new_reno', 'bbr']).default('bbr'),
  udpRelayMode: z.enum(['native', 'quic']).default('native'),
  heartbeatInterval: z.number().optional(),
});

const BaseSocksNodeSchema = BaseNodeSchema.extend({
  username: z.string().optional(),
  password: z.string().optional(),
});

const Socks5NodeSchema = BaseSocksNodeSchema.extend({
  type: z.literal('socks5'),
});

const SocksLegacyNodeSchema = BaseSocksNodeSchema.extend({
  type: z.literal('socks'),
});

export const ProxyNodeSchema = z.discriminatedUnion('type', [
  VmessNodeSchema,
  VlessNodeSchema,
  ShadowsocksNodeSchema,
  TrojanNodeSchema,
  Hysteria2NodeSchema,
  TuicNodeSchema,
  Socks5NodeSchema,
  SocksLegacyNodeSchema,
]);

export const SUPPORTED_PROTOCOLS = new Set([
  'vmess',
  'vless',
  'ss',
  'trojan',
  'socks',
  'socks5',
  'hysteria2',
  'tuic',
]);