import { safeBtoa } from '../../../features/base64.js';

const generators = {
  'vmess': generateVmess,
  'vless': (node) => generateVlessOrTrojan(node, 'vless'),
  'trojan': (node) => generateVlessOrTrojan(node, 'trojan'),
  'ss': generateSS,
  'hysteria2': generateHysteria2,
  'tuic': generateTuic,
  'socks': generateSocks,
};


/**
 * 生成 V2Ray 订阅
 * @param {object[]} unifiedNodes - 通用节点对象数组
 * @returns {string} - 生成的 V2Ray 节点
 */
export default function v2rayGenerator(unifiedNodes) {
    if (!Array.isArray(unifiedNodes) || unifiedNodes.length === 0) {
    return "";
  }
  const generatedNodes = unifiedNodes
    .map(node => {
      const generator = generators[node.type];
      if (generator) {
        return generator(node);
      }
      return null;
    })
    .filter(Boolean);

  return safeBtoa(generatedNodes.join('\n'));
}

function generateVmess(node) {
  const config = {
    v: "2",
    ps: node.name,
    add: node.server,
    port: node.port,
    id: node.uuid,
    aid: node.alterId || 0,
    scy: node.cipher || 'auto',
    net: node.network?.type || 'tcp',
    type: 'none', // 头部伪装，此处简化为 "none"
  };

  // 处理传输层配置
  switch (config.net) {
    case 'ws':
      config.host = node.network?.headers?.Host || node.server;
      config.path = node.network.ws?.path || '/';
      break;
    case 'h2':
      config.host = node.network?.host[0] || node.server;
      config.path = node.network?.path || '/';
      break;
    case 'grpc':
      // V2Ray 客户端通常使用 path 字段来承载 gRPC 的 serviceName
      config.path = node.network?.serviceName || '';
      config.type = node.network?.type === 'multi' ? 'multi' : 'gun'; // 默认gun
      break;
    }

	// 处理 TLS 配置
	if (node.tls?.enabled) {
		config.tls = 'tls';
		config.sni = node.tls.sni || config.host || node.server;
		config.alpn = node.tls.alpn?.join(',') || '';
		config.fp = node.tls.fp || '';
    // allowInsecure 在vmess链接中没有标准字段，通常由客户端UI控制
	}

	// 将 JSON 对象转换为 Base64 编码
  try {
    const jsonStr = JSON.stringify(config);
    const base64Str = safeBtoa(jsonStr);
    return `vmess://${base64Str}`;
  } catch (err) {
    console.error(`Failed to generate Vmess link for node ${node.name}: ${err.message}`);
    return null;
  }
}

function generateVlessOrTrojan(node, protocol) {
  const userInfo = protocol === 'vless' ? node.uuid : node.password;
  const serverAddress = `${node.server}:${node.port}`;
  const params = new URLSearchParams();

  if (node.tls?.enabled) {
    if (node.tls.type === 'reality') {
      params.set('security', 'reality');
      params.set('pbk', node.tls.reality.publicKey);
      params.set('sid', node.tls.reality.shortId);
    } else {
      params.set('security', 'tls');
    }

    if (node.tls.sni) {
      params.set('sni', node.tls.sni);
    }
    if (node.tls.alpn?.length) {
      params.set('alpn', node.tls.alpn.join(','));
    }
    if (node.tls.fp) {
      params.set('fp', node.tls.fp);
    }
  }

  if (protocol === 'vless') {
    if (node.flow) {
      params.set('flow', node.flow);
    }
    params.set('encryption', 'none');
  }

  const queryString = params.toString();
  const anchor = encodeURIComponent(node.name);

  return `${protocol}://${userInfo}@${serverAddress}${queryString ? '?' + queryString : ''}#${anchor}`;
}

function generateSS(node) {
    try {
    const userInfo = `${node.cipher}:${node.password}`;
    const encodedUserInfo = safeBtoa(userInfo);
    const encodedName = encodeURIComponent(node.name);
    return `ss://${encodedUserInfo}@${node.server}:${node.port}#${encodedName}`;
  } catch (error) {
    console.error(`Failed to generate SS link for node ${node.name}: ${error.message}`);
    return null;
  }
}

function generateHysteria2(node) {
  const userInfo = node.password;
  const serverAddress = `${node.server}:${node.port}`;
  const params = new URLSearchParams();

  if (node.tls?.enabled) {
    if (node.tls.sni) {
      params.set('sni', node.tls.sni);
    }
    if (node.tls.alpn?.length) {
      params.set('alpn', node.tls.alpn.join(','));
    }
  }

  if (node.obfs?.type) {
    params.set('obfs', node.obfs.type);
    if (node.obfs.password) {
      params.set('obfs-password', node.obfs.password);
    }
  }

  if (node.ports) {
    params.set('mport', node.ports);
  }

  const queryString = params.toString();
  const anchor = encodeURIComponent(node.name);

  return `hysteria2://${userInfo}@${serverAddress}${queryString ? '?' + queryString : ''}#${anchor}`;
}

function generateTuic(node) {
  const userInfo = `${node.uuid}:${encodeURIComponent(node.password)}`;
  const serverAddress = `${node.server}:${node.port}`;
  const params = new URLSearchParams();

  if (node.tls?.enabled) {
    if (node.tls.sni) {
      params.set('sni', node.tls.sni);
    }
    if (node.tls.alpn?.length) {
      params.set('alpn', node.tls.alpn.join(','));
    }
  }

  if (node.congestionController) {
    params.set('congestion_control', node.congestionController);
  }

  const queryString = params.toString();
  const anchor = encodeURIComponent(node.name);

  return `tuic://${userInfo}@${serverAddress}${queryString ? '?' + queryString : ''}#${anchor}`;
}

function generateSocks(node) {
  const userInfo = `${node.username}:${node.password}`;
  const serverAddress = `${node.server}:${node.port}`;
  const params = new URLSearchParams();

  const queryString = params.toString();
  const anchor = encodeURIComponent(node.name);

  return `socks://${userInfo}@${serverAddress}${queryString ? '?' + queryString : ''}#${anchor}`;
}