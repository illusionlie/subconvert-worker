import { safeBtoa } from '../features/base64.js';
import yaml from 'js-yaml';

/**
 * 为 VLESS 和 Trojan 构建通用的 URL 查询参数
 * @param {URLSearchParams} params - URLSearchParams 实例
 * @param {object} proxy - 代理配置对象
 */
function buildCommonUrlParams(params, proxy) {
    // 处理 TLS 和 Reality
    if (proxy.tls === true) {
        const { 'public-key': publicKey, 'short-id': shortId } = proxy['reality-opts'] || {};
        if (publicKey && shortId) {
            params.set('security', 'reality');
            params.set('pbk', publicKey);
            params.set('sid', shortId);
        } else {
            params.set('security', 'tls');
        }

        const sni = proxy.sni ?? proxy.servername;
        if (sni) {
            params.set('sni', sni);
        }
        if (Array.isArray(proxy.alpn) && proxy.alpn.length > 0) {
            params.set('alpn', proxy.alpn.join(','));
        }
        if (proxy['client-fingerprint']) {
            params.set('fp', proxy['client-fingerprint']);
        }
    }

    if (proxy['skip-cert-verify'] === true) {
        params.set('allowInsecure', '1');
    }

    // 处理网络传输配置
    const network = proxy.network;
    if (['ws', 'h2', 'grpc'].includes(network)) {
        params.set('type', network);
        const opts = proxy[`${network}-opts`] || {};
        
        if (network === 'ws' || network === 'h2') {
            const host = (network === 'ws' ? opts.headers?.Host : opts.host);
            if (host) params.set('host', host);
            if (opts.path) params.set('path', opts.path);
        } else if (network === 'grpc') {
            const serviceName = opts['grpc-service-name'];
            if (serviceName) params.set('serviceName', serviceName);
            params.set('mode', 'gun');
        }
    }
}

/**
 * 将 Clash 订阅转换为 V2ray 订阅。
 * @param {string} clashConfig - Clash 订阅字符串。
 * @returns {string} V2ray 订阅字符串。
 */
export function convertClashToV2ray(clashConfig) {
    let config;
    try {
        config = yaml.load(clashConfig);
    } catch (e) {
        console.error("YAML parsing failed:", e.message);
        return { v2rayConfig: '', nodeCounter: 0, convertCounter: 0, error: 'Invalid Clash configuration format.' };
    }

    if (!config || !Array.isArray(config.proxies)) {
        console.warn("No 'proxies' array found in the configuration.");
        return { v2rayConfig: '', nodeCounter: 0, convertCounter: 0 };
    }

    const proxies = config.proxies;
    const v2rayLinks = [];
    let convertCounter = 0;

    for (const proxy of proxies) {
        let link = '';
        const converterMap = {
            'vmess': convertVmess,
            'vless': convertVless,
            'ss': convertSs,
            'trojan': convertTrojan,
            'hysteria2': convertHysteria2,
            'tuic': convertTuic,
        };
        
        const converter = converterMap[proxy.type];
        if (converter) {
            link = converter(proxy);
        }

        if (link) {
            convertCounter++;
            v2rayLinks.push(link);
        }
    }
    
    console.log(`Total nodes: ${proxies.length}, Successfully converted: ${convertCounter}`);
    
    return {
        v2rayConfig: safeBtoa(v2rayLinks.join('\n')),
        nodeCounter: proxies.length,
        convertCounter: convertCounter
    };
}

/**
 * 将 Clash Vmess 配置转换为 V2ray 链接。
 * @param {object} proxy - Clash Vmess 配置。
 * @returns {string} V2ray 链接。
 */
/*
function convertVmess(proxy) {
    const vmessConfig = [
        'v=2',
        `ps=${proxy.name}`,
        `add=${proxy.server}`,
        `port=${proxy.port}`,
        `id=${proxy.uuid}`,
        `aid=${proxy.alterId}`,
        `scy=${proxy.cipher || 'auto'}`,
        `net=${['tcp', 'ws', 'h2', 'grpc'].includes(proxy.network) ? proxy.network : 'tcp'}`,
        `type=none`,
        proxy.network === 'ws' && proxy['ws-opts'] && `host=${proxy['ws-opts'].headers?.Host || ''}`,
        proxy.network === 'ws' && proxy['ws-opts'] && `path=${proxy['ws-opts'].path || ''}`,
        proxy.network === 'h2' && proxy['h2-opts'] && `host=${proxy['h2-opts'].host || ''}`,
        proxy.network === 'h2' && proxy['h2-opts'] && `path=${proxy['h2-opts'].path || ''}`,
        proxy.network === 'grpc' && proxy['grpc-opts'] && `serviceName=${proxy['grpc-opts']['grpc-service-name'] || ''}`,
        proxy.network === 'grpc' && proxy['grpc-opts'] && `mode=gun`,
        proxy.tls === true && `tls=tls`,
        (proxy.sni || proxy.servername) && `sni=${proxy.servername || proxy.sni}`,
        proxy.alpn && `alpn=${proxy.alpn}`,
        proxy['client-fingerprint'] && `fp=${proxy['client-fingerprint']}`
    ];
    let vmess = {};
    vmessConfig.filter(Boolean).forEach(item => {
        const [key, value] = item.split('=');
        vmess[key] = value;
    });
    const result = 'vmess://' + safeBtoa(JSON.stringify(vmess));
    console.log(vmess);
    return result;
}
*/
function convertVmess(proxy) {
    if (!proxy || !proxy.name || !proxy.server || proxy.port == null || !proxy.uuid || proxy.alterId == null) {
        console.error("无法生成 URI: 代理对象缺少核心属性。");
        return null;
    }

    const {
        name,
        server,
        port,
        uuid,
        alterId,
        cipher = 'auto',
        network = 'tcp',
        tls,
        servername,
        sni,
        alpn,
    } = proxy;

    const vmess = {
        v: "2",
        ps: name,
        add: server,
        port: port,
        id: uuid,
        aid: alterId,
        scy: cipher,
        net: network,
        type: "none", // 默认为 "none"
    };

    if (tls === true) {
        vmess.tls = "tls";

        const effectiveSni = sni ?? servername;
        if (effectiveSni) {
            vmess.sni = effectiveSni;
        }

        if (Array.isArray(alpn) && alpn.length > 0) {
            vmess.alpn = alpn.join(',');
        }

        if (proxy['client-fingerprint']) {
            vmess.fp = proxy['client-fingerprint'];
        }
    }

    const netOpts = proxy[`${network}-opts`] || {};

    switch (network) {
        case 'ws': {
            const host = netOpts.headers?.Host;
            if (host) vmess.host = host;
            vmess.path = netOpts.path || '/';
            break;
        }
        case 'h2': {
            const host = netOpts.host;
            if (Array.isArray(host) && host.length > 0) {
                vmess.host = host.join(',');
            } else if (host && typeof host === 'string') {
                vmess.host = host;
            }
            vmess.path = netOpts.path || '/';
            break;
        }
        case 'grpc': {
            const serviceName = netOpts['grpc-service-name'];
            if (serviceName) {
                vmess.path = serviceName;
            }
            vmess.mode = "gun";
            break;
        }
    }
    
    return 'vmess://' + safeBtoa(JSON.stringify(vmess));
}

/**
 * 将 Clash VLESS 配置转换为 V2ray 链接。
 * @param {object} proxy - Clash VLESS 配置。
 * @returns {string} V2ray 链接。
 */
/*
function convertVless(proxy) {
    const vlessConfig = [
        proxy.uuid + '@' + proxy.server + ':' + proxy.port + '?encryption=none',
        proxy.flow && `&flow=${proxy.flow}`,
        proxy.tls === true ? (proxy['reality-opts'] ? '&security=reality' : '&security=tls') : '',
        proxy.tls === true && proxy['reality-opts'] && `&pbk=${proxy['reality-opts']['public-key']}&sid=${proxy['reality-opts']['short-id']}`,
        (proxy.sni || proxy.servername) && `&sni=${proxy.servername || proxy.sni}`,
        proxy.alpn && `&alpn=${proxy.alpn}`,
        proxy['client-fingerprint'] && `&fp=${proxy['client-fingerprint']}`,
        proxy['skip-cert-verify'] === true && `&allowInsecure=true`,
        `&type=${['tcp', 'ws', 'h2', 'grpc'].includes(proxy.network) ? proxy.network : 'tcp'}`,
        proxy.network === 'ws' && proxy['ws-opts'] && `&host=${proxy['ws-opts'].headers?.Host || ''}&path=${proxy['ws-opts'].path || ''}`,
        proxy.network === 'h2' && proxy['h2-opts'] && `&host=${proxy['h2-opts'].host || ''}&path=${proxy['h2-opts'].path || ''}`,
        proxy.network === 'grpc' && proxy['grpc-opts'] && `&serviceName=${proxy['grpc-opts']['grpc-service-name'] || ''}&mode=gun`,
    ]
    const result = 'vless://' + vlessConfig.filter(Boolean).join('') + '#' + encodeURIComponent(proxy.name);
    console.log(result);
    return result;
}
*/
function convertVless(proxy) {
    if (!proxy || !proxy.server || !proxy.port || !proxy.uuid || !proxy.name) {
        console.error("无法生成 URI: 代理对象缺少核心属性。");
        return null;
    }

    const params = new URLSearchParams();

    buildCommonUrlParams(params, proxy);

    if (proxy.flow) {
        params.set('flow', proxy.flow);
    }

    const serverAddress = `${proxy.server}:${proxy.port}`;
    const anchor = encodeURIComponent(proxy.name);

    const queryString = params.toString();
    const finalURI = `vless://${proxy.uuid}@${serverAddress}${queryString ? '?' + queryString : ''}#${anchor}`;

    console.log(finalURI);
    return finalURI;
}

/**
 * 将 Clash Shadowsocks 配置转换为 V2ray 链接。
 * @param {object} proxy - Clash Shadowsocks 配置。
 * @returns {string} V2ray 链接。
 */
function convertSs(proxy) {
    if (!proxy || !proxy.server || proxy.port == null || !proxy.cipher || !proxy.password || !proxy.name) {
        console.error("无法生成 SS URI: 代理对象缺少核心属性。");
        return null;
    }

    const ssConfig = [
        safeBtoa(`${proxy.cipher}:${proxy.password}`) + '@' + proxy.server + ':' + proxy.port,
        `#${encodeURIComponent(proxy.name)}`
    ];
    const result = 'ss://' + ssConfig.filter(Boolean).join('');
    console.log(result);
    return result;
}

/**
 * 将 Clash Trojan 配置转换为 V2ray 链接。
 * @param {object} proxy - Clash Trojan 配置。
 * @returns {string} V2ray 链接。
 */
/*
function convertTrojan(proxy) {
    const trojanConfig = [
        proxy.password + '@' + proxy.server + ':' + proxy.port,
        `?type=${['tcp', 'ws', 'h2', 'grpc'].includes(proxy.network) ? proxy.network : 'tcp'}`,
        proxy.tls === true ? (proxy['reality-opts'] ? '&security=reality' : '&security=tls') : '',
        proxy.tls === true && proxy['reality-opts'] && `&pbk=${proxy['reality-opts']['public-key']}&sid=${proxy['reality-opts']['short-id']}`,
        (proxy.sni || proxy.servername) && `&sni=${proxy.servername || proxy.sni}`,
        proxy.alpn && `&alpn=${proxy.alpn}`,
        proxy['client-fingerprint'] && `&fp=${proxy['client-fingerprint']}`,
        proxy['skip-cert-verify'] === true && `&allowInsecure=1`,        
        proxy.network === 'ws' && proxy['ws-opts'] && `&host=${proxy['ws-opts'].headers?.Host || ''}&path=${proxy['ws-opts'].path || ''}`,
        proxy.network === 'h2' && proxy['h2-opts'] && `&host=${proxy['h2-opts'].host || ''}&path=${proxy['h2-opts'].path || ''}`,
        proxy.network === 'grpc' && proxy['grpc-opts'] && `&serviceName=${proxy['grpc-opts']['grpc-service-name'] || ''}&mode=gun`
    ];
    const result = 'trojan://' + trojanConfig.filter(Boolean).join('') + '#' + encodeURIComponent(proxy.name);
    console.log(result);
    return result;
}
*/
function convertTrojan(proxy) {
    if (!proxy || !proxy.server || proxy.port == null || !proxy.password || !proxy.name) {
        console.error("无法生成 URI: 代理对象缺少核心属性。");
        return null;
    }

    const params = new URLSearchParams();

    buildCommonUrlParams(params, proxy);

    const serverAddress = `${proxy.server}:${proxy.port}`;
    const anchor = encodeURIComponent(proxy.name);
    
    const queryString = params.toString();
    const finalURI = `trojan://${proxy.password}@${serverAddress}${queryString ? '?' + queryString : ''}#${anchor}`;

    console.log(finalURI);
    return finalURI;
}
/**
 * 将 Clash Hysteria2 配置转换为 V2ray 链接。
 * @param {object} proxy - Clash Hysteria2 配置。
 * @returns {string} V2ray 链接。
 */
/*
function convertHysteria2(proxy) {
    const hysteriaConfig = [
        proxy.password + '@' + proxy.server + ':' + proxy.port + '?',
        (proxy.sni || proxy.servername) && `sni=${proxy.servername || proxy.sni}&`,
        proxy.alpn && `alpn=${proxy.alpn}&`,
        proxy.obfs && `obfs=${proxy.obfs}&`,
        proxy['obfs-password'] && `obfs-password=${proxy['obfs-password']}&`,
        proxy.ports && `mport=${proxy.ports}&`,
        // proxy['client-fingerprint'] && `fp=${proxy['client-fingerprint']}&`,
        proxy['skip-cert-verify'] === true && `allowInsecure=1`,
    ];
    const result = 'hysteria2://' + hysteriaConfig.filter(Boolean).join('') + '#' + encodeURIComponent(proxy.name);
    console.log(result);
    return result;
}
*/
function convertHysteria2(proxy) {
    if (!proxy || !proxy.server || !proxy.port || !proxy.password || !proxy.name) {
        console.error("无法生成 URI: 代理对象缺少核心属性。");
        return null;
    }

    const params = new URLSearchParams();

    const sni = proxy.sni ?? proxy.servername;
    if (sni) {
        params.set('sni', sni);
    }

    if (Array.isArray(proxy.alpn) && proxy.alpn.length > 0) {
        params.set('alpn', proxy.alpn.join(','));
    }

    if (proxy.obfs) {
        params.set('obfs', proxy.obfs);
    }

    if (proxy['obfs-password']) {
        params.set('obfs-password', proxy['obfs-password']);
    }

    if (proxy['skip-cert-verify'] === true) {
        params.set('allowInsecure', '1');
    }

    if (proxy.ports) {
        params.set('mport', proxy.ports);
    }

    const serverAddress = `${proxy.server}:${proxy.port}`;
    const anchor = encodeURIComponent(proxy.name);

    const queryString = params.toString();
    const finalURI = `hysteria2://${proxy.password}@${serverAddress}${queryString ? '?' + queryString : ''}#${anchor}`;

    console.log(finalURI);
    return finalURI;
}
/**
 * 将 Clash TUIC 配置转换为 V2ray 链接。
 * @param {object} proxy - Clash TUIC 配置。
 * @returns {string} V2ray 链接。
 */
/*
function convertTuic(proxy) {
    // TUIC V4 Not Supported
    if (proxy.token) return;
    const tuicConfig = [
        proxy.uuid + ':' + proxy.password + '@' + (proxy.ip ? proxy.ip : proxy.server) + ':' + proxy.port + '?',
        proxy['disable-sni'] !== true && (proxy.sni || proxy.servername) && `sni=${proxy.servername || proxy.sni}&`,
        proxy.alpn && `alpn=${proxy.alpn}&`,
        proxy['congestion-controller'] && `congestion_control=${proxy['congestion-controller']}`,
    ];
    const result = 'tuic://' + tuicConfig.filter(Boolean).join('') + '#' + encodeURIComponent(proxy.name);
    console.log(result);
    return result;
}
*/
function convertTuic(proxy) {
    if (!proxy || !proxy.uuid || !proxy.password || !proxy.server || !proxy.port || !proxy.name) {
        console.error("无法生成 URI: 代理对象缺少核心属性。");
        return null;
    }

    if (proxy.token) {
        console.warn("TUIC V4 Not Supported");
        return null;
    }

    const userInfo = `${proxy.uuid}:${encodeURIComponent(proxy.password)}`;
    const host = proxy.ip ?? proxy.server;
    const authority = `${userInfo}@${host}:${proxy.port}`;

    const params = new URLSearchParams();

    const sni = proxy.sni ?? proxy.servername;
    if (proxy['disable-sni'] !== true && sni) {
        params.set('sni', sni);
    }

    if (Array.isArray(proxy.alpn) && proxy.alpn.length > 0) {
        params.set('alpn', proxy.alpn.join(','));
    }

    if (proxy['congestion-controller']) {
        params.set('congestion_control', proxy['congestion-controller']);
    }

    const anchor = encodeURIComponent(proxy.name);
    const queryString = params.toString();

    const finalURI = `tuic://${authority}${queryString ? '?' + queryString : ''}#${anchor}`;

    console.log(finalURI);
    return finalURI;
}