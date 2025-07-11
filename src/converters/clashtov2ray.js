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

    if (proxies) {
        for (const proxy of proxies) {
            let link = '';
            switch (proxy.type) {
                case 'vmess':
                    link = convertVmessToV2ray(proxy);
                    break;
                case 'ss':
                    link = convertSsToV2ray(proxy);
                    break;
                case 'trojan':
                    link = convertTrojanToV2ray(proxy);
                    break;
                case 'vless':
                    link = convertVlessToV2ray(proxy);
                    break;
                // TODO: Add support for other proxy types
            }
            if (link) {
                v2rayLinks.push(link);
            }
        }
    }

    return safeBtoa(v2rayLinks.join('\n'));
}

/**
 * 将 Clash Vmess 配置转换为 V2ray 链接。
 * @param {object} proxy - Clash Vmess 配置。
 * @returns {string} V2ray 链接。
 */
function convertVmessToV2ray(proxy) {
    const vmessConfig = [
        'v=2',
        `ps=${decodeURIComponent(proxy.name)}`,
        `add=${proxy.server}`,
        `port=${proxy.port}`,
        `id=${proxy.uuid}`,
        `aid=${proxy.alterId}`,
        `scy=${proxy.cipher}`,
        `net=${proxy.network}`,
        `type=${proxy.type}`,
        `host=${proxy['ws-opts']?.headers?.Host || ''}`,
        `path=${proxy['ws-opts']?.path || ''}`,
        `tls=${proxy.tls ? 'tls' : ''}`,
        `sni=${proxy.sni || proxy.servername || ''}`,
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
function convertVlessToV2ray(proxy) {
const vlessConfig = [
    proxy.uuid + '@' + proxy.server + ':' + proxy.port + '?encryption=none',
    proxy.flow && `&flow=${proxy.flow}`,
    proxy.tls && `&security=tls`,
    proxy.servername && `&sni=${proxy.servername}`,
    proxy.alpn && `&alpn=${proxy.alpn}`,
    proxy['client-fingerprint'] && `&fp=${proxy['client-fingerprint']}`,
    proxy['skip-cert-verify'] && `&allowInsecure=true`,
    `&type=${proxy.network}`,
    proxy.network === 'ws' && proxy['ws-opts'] && `&host=${proxy['ws-opts'].headers?.Host || ''}&path=${proxy['ws-opts'].path || ''}`
]
return 'vless://' + vlessConfig.filter(Boolean).join('') + '#' + encodeURIComponent(proxy.name);
}
/**
 * 将 Clash Shadowsocks 配置转换为 V2ray 链接。
 * @param {object} proxy - Clash Shadowsocks 配置。
 * @returns {string} V2ray 链接。
 */
function convertSsToV2ray(proxy) {
    const encoded = safeBtoa(`${proxy.cipher}:${proxy.password}`);
    return `ss://${encoded}@${proxy.server}:${proxy.port}#${encodeURIComponent(proxy.name)}`;
}

/**
 * 将 Clash Trojan 配置转换为 V2ray 链接。
 * @param {object} proxy - Clash Trojan 配置。
 * @returns {string} V2ray 链接。
 */
function convertTrojanToV2ray(proxy) {
    const sni = proxy['sni'] || proxy['server-name'] || '';
    return `trojan://${proxy.password}@${proxy.server}:${proxy.port}?sni=${sni}#${encodeURIComponent(proxy.name)}`;
}

/**
 * 将 Clash Hysteria2 配置转换为 V2ray 链接。
 * @param {object} proxy - Clash Hysteria2 配置。
 * @returns {string} V2ray 链接。
 */
function convertHysteria2ToV2ray(proxy) {
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