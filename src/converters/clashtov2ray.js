import { safeBtoa, safeAtob } from '../features/base64.js';
import { isBase64 } from '../features/base64.js';
import yaml from 'js-yaml';

/**
 * 将 Clash 订阅转换为 V2ray 订阅。
 * @param {string} clashConfig - Clash 订阅字符串。
 * @returns {string} V2ray 订阅字符串。
 */
export function convertClashToV2ray(clashConfig) {
    const config = yaml.load(clashConfig);
    const proxies = config.proxies;
    const v2rayLinks = [];
    let nodeCounter = 0;
    let convertCounter = 0;

    if (proxies) {
        for (const proxy of proxies) {
            nodeCounter++;
            let link = '';
            switch (proxy.type) {
                case 'vmess':
                    link = convertVmess(proxy);
                    break;
                case 'vless':
                    link = convertVless(proxy);
                    break;
                case 'ss':
                    link = convertSs(proxy);
                    break;
                case 'trojan':
                    link = convertTrojan(proxy);
                    break;
                case 'hysteria2':
                    link = convertHysteria2(proxy);
                    break;
                case 'tuic':
                    link = convertTuic(proxy);
                    break;
                // TODO: Add support for other proxy types
            }
            if (link) {
                convertCounter++;
                v2rayLinks.push(link);
            }
        }
    }
    console.log("nodeCounter: " + nodeCounter + ", convertCounter: " + convertCounter);
    return {
        v2rayConfig: safeBtoa(v2rayLinks.join('\n')),
        nodeCounter: nodeCounter,
        convertCounter: convertCounter
    };
}

/**
 * 将 Clash Vmess 配置转换为 V2ray 链接。
 * @param {object} proxy - Clash Vmess 配置。
 * @returns {string} V2ray 链接。
 */
function convertVmess(proxy) {
    const vmessConfig = [
        'v=2',
        `ps=${decodeURIComponent(proxy.name)}`,
        `add=${proxy.server}`,
        `port=${proxy.port}`,
        `id=${proxy.uuid}`,
        `aid=${proxy.alterId}`,
        `scy=${proxy.cipher}`,
        `net=${['tcp', 'ws', 'h2', 'grpc'].includes(proxy.network) ? proxy.network : 'tcp'}`,
        `type=${proxy.type}`,
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

/**
 * 将 Clash VLESS 配置转换为 V2ray 链接。
 * @param {object} proxy - Clash VLESS 配置。
 * @returns {string} V2ray 链接。
 */
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
/**
 * 将 Clash Shadowsocks 配置转换为 V2ray 链接。
 * @param {object} proxy - Clash Shadowsocks 配置。
 * @returns {string} V2ray 链接。
 */
function convertSs(proxy) {
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

/**
 * 将 Clash Hysteria2 配置转换为 V2ray 链接。
 * @param {object} proxy - Clash Hysteria2 配置。
 * @returns {string} V2ray 链接。
 */
function convertHysteria2(proxy) {
    const hysteriaConfig = [
        proxy.password + '@' + proxy.server + ':' + proxy.port + '?',
        proxy.sni || proxy.servername && `sni=${proxy.servername}&`,
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

/**
 * 将 Clash TUIC 配置转换为 V2ray 链接。
 * @param {object} proxy - Clash TUIC 配置。
 * @returns {string} V2ray 链接。
 */
function convertTuic(proxy) {
    // TUIC V4 Not Supported
    if (proxy.token) return;
    const tuicConfig = [
        proxy.uuid + ':' + proxy.password + '@' + (proxy.ip ? proxy.ip : proxy.server) + ':' + proxy.port + '?',
        proxy['disable-sni'] !== true && (proxy.sni || proxy.servername) && `sni=${proxy.servername || proxy.sni}&`,
        proxy.alpn && `alpn=${proxy.alpn}&`,
        proxy['congestion-controller'] && `congestion_control=${proxy['congestion-controller']}&`,
    ];
    const result = 'tuic://' + tuicConfig.filter(Boolean).join('') + '#' + encodeURIComponent(proxy.name);
    console.log(result);
    return result;
}