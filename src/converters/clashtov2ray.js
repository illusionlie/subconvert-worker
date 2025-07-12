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
                case 'ss':
                    link = convertSs(proxy);
                    break;
                case 'trojan':
                    link = convertTrojan(proxy);
                    break;
                case 'vless':
                    link = convertVless(proxy);
                    break;
                // TODO: Add support for other proxy types
            }
            if (link) {
                convertCounter++;
                v2rayLinks.push(link);
            }
        }
    }

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
        `net=${['tcp', 'ws', 'h2'].includes(proxy.network) ? proxy.network : 'tcp'}`,
        `type=${proxy.type}`,
        proxy.network === 'ws' && proxy['ws-opts'] && `&host=${proxy['ws-opts'].headers?.Host || ''}&path=${proxy['ws-opts'].path || ''}`,
        proxy.network === 'h2' && proxy['h2-opts'] && `&host=${proxy['h2-opts'].host || ''}&path=${proxy['h2-opts'].path || ''}`,
        proxy.tls && `tls=${proxy.tls ? 'tls' : ''}`,
        proxy.tls && `sni=${proxy.sni || proxy.servername || ''}`,
        proxy.alpn && `alpn=${proxy.alpn}`,
        proxy['client-fingerprint'] && `fp=${proxy['client-fingerprint']}`
    ];
    let vmess = {};
    vmessConfig.filter(Boolean).forEach(item => {
        const [key, value] = item.split('=');
        vmess[key] = value;
    });
    return 'vmess://' + safeBtoa(JSON.stringify(vmess));
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
    proxy.tls && `&security=tls`,
    proxy.servername && `&sni=${proxy.servername}`,
    proxy.alpn && `&alpn=${proxy.alpn}`,
    proxy['client-fingerprint'] && `&fp=${proxy['client-fingerprint']}`,
    proxy['skip-cert-verify'] && `&allowInsecure=true`,
    `&type=${proxy.network}`,
    proxy.network === 'ws' && proxy['ws-opts'] && `&host=${proxy['ws-opts'].headers?.Host || ''}&path=${proxy['ws-opts'].path || ''}`,
    proxy.network === 'h2' && proxy['h2-opts'] && `&host=${proxy['h2-opts'].host || ''}&path=${proxy['h2-opts'].path || ''}`,
]
return 'vless://' + vlessConfig.filter(Boolean).join('') + '#' + encodeURIComponent(proxy.name);
}
/**
 * 将 Clash Shadowsocks 配置转换为 V2ray 链接。
 * @param {object} proxy - Clash Shadowsocks 配置。
 * @returns {string} V2ray 链接。
 */
function convertSs(proxy) {
    const encoded = safeBtoa(`${proxy.cipher}:${proxy.password}`);
    return `ss://${encoded}@${proxy.server}:${proxy.port}#${encodeURIComponent(proxy.name)}`;
}

/**
 * 将 Clash Trojan 配置转换为 V2ray 链接。
 * @param {object} proxy - Clash Trojan 配置。
 * @returns {string} V2ray 链接。
 */
function convertTrojan(proxy) {
    const trojanConfig = [
        proxy.password + '@' + proxy.server + ':' + proxy.port,
        `?type=${proxy.network}`,
        proxy.tls && `&security=tls`,
        proxy.servername && `&sni=${proxy.servername}`,
        proxy.alpn && `&alpn=${proxy.alpn}`,
        proxy['client-fingerprint'] && `&fp=${proxy['client-fingerprint']}`,
        proxy['skip-cert-verify'] && `&allowInsecure=1`,        
        proxy.network === 'ws' && proxy['ws-opts'] && `&host=${proxy['ws-opts'].headers?.Host || ''}&path=${proxy['ws-opts'].path || ''}`,
        proxy.network === 'h2' && proxy['h2-opts'] && `&host=${proxy['h2-opts'].host || ''}&path=${proxy['h2-opts'].path || ''}`,
    ];
    return 'trojan://' + trojanConfig.filter(Boolean).join('') + '#' + encodeURIComponent(proxy.name);
}

/**
 * 将 Clash Hysteria2 配置转换为 V2ray 链接。
 * @param {object} proxy - Clash Hysteria2 配置。
 * @returns {string} V2ray 链接。
 */
function convertHysteria2(proxy) {
    const hysteriaConfig = {
        protocol: 'hysteria2',
        server: proxy.server,
        port: proxy.port,
        auth_str: proxy.password,
        alpn: proxy.alpn,
        sni: proxy.sni,
        skip_cert_verify: proxy.skipCertVerify
    };

    return 'hysteria2://' + safeBtoa(JSON.stringify(hysteriaConfig));
}