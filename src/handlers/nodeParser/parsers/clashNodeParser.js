import { SUPPORTED_PROTOCOLS } from '../../../features/UnifiedNode.js';

/**
 * 解析 Clash 节点数组。
 * @param {object[]} clashNodes - Clash 节点对象数组
 * @returns {object[]} - 解析后的通用节点对象数组
 */
export default function parseClashNodes(clashNodes) {
  if (!Array.isArray(clashNodes)) {
    return { nodes: [], nodeCounter: 0, convertCounter: 0 };
  }
  const result = [];
  let nodeCounter = 0;
  let convertCounter = 0;

  for (const node of clashNodes) {
    nodeCounter++;
    if (!SUPPORTED_PROTOCOLS.has(node.type)) {
      continue;
    }
    const parsedNode = parseNode(node);
    if (parsedNode) {
      convertCounter++;
      result.push(parsedNode);
    }
  }
  return {
    nodes: result,
    nodeCounter,
    convertCounter,
  };
}

function parseNode(node) {
  if (typeof node !== 'object' || !(node.server ?? node.ip) || !node.port || !node.type) {
    console.error(`Failed to parse Clash node: ${node.name}`);
    return null;
  }
  const standardNode = {
    type: node.type,
    name: node.name ?? "Unamed",
    server: node.ip ?? node.server, // node.ip 是TUIC的覆写选项
    port: node.port,
    udp: node.udp ?? false,
    tfo: node.tfo ?? false,
    mptcp: node.mptcp ?? false,
  };
  if (node.tls === true) {
    standardNode.tls = {
      enabled: true,
      serverName: (node.sni ?? node.servername) ?? '',
      allowInsecure: node['skip-cert-verify'] ?? false,
      alpn: node.alpn ?? [],
      fingerprint: node['client-fingerprint'] ?? "random",
    };
  }
  if (node.network) {
    switch (node.network) {
      case 'ws': {
        standardNode.network = {
          type: 'ws',
          path: node['ws-opts']?.path ?? '',
          headers: node['ws-opts']?.headers ?? {},
        };
        break;
      }
      case 'h2': {
        standardNode.network = {
          type: 'h2',
          host: [node['h2-opts']?.host] || [],
          path: node['h2-opts']?.path ?? '',
        };
        break;
      }
      case 'grpc': {
        standardNode.network = {
          type: 'grpc',
          serviceName: node['grpc-opts']?.['grpc-service-name'] ?? '',
          gRPCtype: 'gun',
        };
        break;
      }
    }
  }
  if (node.type === 'vmess') {
    if (!node.uuid || node.uuid === '' || node.alterId == null) return null;
    standardNode.uuid = node.uuid;
    standardNode.alterId = node.alterId;
    standardNode.cipher = node.cipher ?? "auto";
    standardNode.packetEncoding = node.packetEncoding ?? '';
    standardNode.globalPadding = node.globalPadding ?? false;
    standardNode.authenticatedLength = node.authenticatedLength ?? false;
  }
  if (node.type === 'vless') {
    if (!node.uuid || node.uuid === '') return null;
    standardNode.uuid = node.uuid ?? node.id;
    standardNode.flow = node.flow ?? '';
    standardNode.packetEncoding = node.packetEncoding ?? 'none';
  }
  if (node.type === 'trojan') {
    if (!node.password || node.password === '') return null;
    standardNode.password = node.password;
  }
  if (node.type === 'hysteria2') {
    if (!node.password || node.password === '') return null;
    standardNode.ports = node.ports ?? '';
    standardNode.password = node.password ?? node.id;
    standardNode.up = node.up ? parseInt(String(node.up).replace(/[^0-9]/g, '')) : 0;
    standardNode.down = node.down ? parseInt(String(node.down).replace(/[^0-9]/g, '')) : 0;
    standardNode.obfs = {
      type: node.obfs ?? '',
      password: node['obfs-password'] ?? '',
    }
  }
  if (node.type === 'ss') {
    if (!node.cipher || node.cipher === '' || !node.password || node.password === '') return null;
    standardNode.cipher = node.cipher;
    standardNode.password = node.password;
  }
  if (node.type === 'tuic') {
    if (!node.uuid || node.uuid === '' || !node.password || node.password === '' || node.token) return null;
    standardNode.uuid = node.uuid ?? node.id;
    standardNode.password = node.password ?? node.id;
    standardNode.heartbeatInterval = node['heartbeat-interval'] ?? 0;
    standardNode.udpRelayMode = node['udp-relay-mode'] ?? 'native';
    standardNode.congestionController = node['congestion-controller'] ?? 'bbr';
  }
  return standardNode;
}