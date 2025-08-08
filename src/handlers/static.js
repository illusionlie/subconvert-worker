import * as Responses from '../utils/response.js';

export default async function handleStaticRequest(request, env, ctx) {
  const url = new URL(request.url);
  const { pathname } = url;

  const favIcon = '<svg class="card__icon" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 1-9 9H3.5a2.5 2.5 0 0 1 0-5H9"/><path d="M3 12a9 9 0 0 1 9-9h8.5a2.5 2.5 0 0 1 0 5H12"/></svg>';
  const index = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SubConverter - 在线订阅转换</title>
        <meta name="description" content="一个基于 Cloudflare Workers 的轻量级、高效的在线订阅转换工具。支持 Clash, V2Ray, Sing-box 等多种格式。">
        <style>
            :root {
                --font-family-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif;
                --background-image: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                --card-background-color: rgba(255, 255, 255, 0.15);
                --card-backdrop-filter: blur(20px);
                --card-border-radius: 20px;
                --card-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
                --text-color-primary: #ffffff;
                --text-color-secondary: rgba(255, 255, 255, 0.75);
                --control-background-color: rgba(0, 0, 0, 0.25);
                --control-border-radius: 10px;
                --control-focus-shadow: 0 0 0 3px rgba(130, 138, 255, 0.5);
                --button-primary-bg: #828aff;
                --button-primary-hover-bg: #949cff;
                --success-color: #28a745;
                --error-color: #ff8282;
                --transition-speed: 0.3s;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { height: 100%; }
            body {
                font-family: var(--font-family-sans);
                background-image: var(--background-image);
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
                color: var(--text-color-primary);
            }
            .card {
                width: 100%;
                max-width: 550px;
                background: var(--card-background-color);
                backdrop-filter: var(--card-backdrop-filter);
                -webkit-backdrop-filter: var(--card-backdrop-filter);
                border-radius: var(--card-border-radius);
                border: 1px solid rgba(255, 255, 255, 0.18);
                box-shadow: var(--card-shadow);
                padding: 30px 35px;
                display: flex;
                flex-direction: column;
                gap: 25px;
            }
            .card__header { display: flex; align-items: center; gap: 15px; }
            .card__icon { width: 40px; height: 40px; }
            .card__title { font-size: 24px; font-weight: 600; }
            .form__group { display: flex; flex-direction: column; gap: 8px; }
            .form__controls-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .form__label { font-size: 14px; font-weight: 500; color: var(--text-color-secondary); padding-left: 5px; }
            .form__input, .form__select, .form__button {
                width: 100%;
                background: var(--control-background-color);
                border: none;
                border-radius: var(--control-border-radius);
                padding: 12px 15px;
                font-family: inherit;
                font-size: 16px;
                color: var(--text-color-primary);
                transition: all var(--transition-speed) ease;
            }
            .form__input::placeholder { color: var(--text-color-secondary); }
            .form__input:focus, .form__select:focus {
                outline: none;
                box-shadow: var(--control-focus-shadow);
                background: rgba(0, 0, 0, 0.4);
            }
            .form__input { min-height: 100px; resize: vertical; }
            .form__select {
                appearance: none; -webkit-appearance: none;
                background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFFB3%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E');
                background-repeat: no-repeat;
                background-position: right 15px top 50%;
                background-size: 10px;
            }
            .form__button { cursor: pointer; font-weight: 600; }
            .form__button--secondary { background-color: var(--control-background-color); }
            .form__button--secondary:hover { background-color: rgba(0, 0, 0, 0.4); }
            .form__button--primary { background-color: var(--button-primary-bg); color: #fff; margin-top: 10px; }
            .form__button--primary:hover { background-color: var(--button-primary-hover-bg); }
            .form__button:disabled { cursor: not-allowed; opacity: 0.6; }
            .advanced-options {
                max-height: 0;
                overflow: hidden;
                transition: max-height var(--transition-speed) ease-in-out;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                background: rgba(0,0,0,0.1);
                padding: 0 15px;
                border-radius: var(--control-border-radius);
            }
            .advanced-options.visible { max-height: 500px; padding: 15px; }
            .checkbox-group { display: flex; align-items: center; gap: 10px; padding-top: 8px; }
            .checkbox-group label { font-size: 14px; color: var(--text-color-secondary); cursor: pointer; }
            .checkbox-group input { accent-color: var(--button-primary-bg); }
            .result-area {
                display: none;
                background: rgba(0, 0, 0, 0.2);
                border-radius: var(--control-border-radius);
                padding: 15px;
                margin-top: 10px;
            }
            .result-area.visible { display: block; }
            .result__title { font-size: 14px; font-weight: 500; color: var(--text-color-secondary); margin-bottom: 8px; }
            .result__output-wrapper { display: flex; gap: 10px; }
            .result__output {
                flex-grow: 1; background: rgba(0, 0, 0, 0.3); border: none;
                border-radius: 8px; padding: 10px; font-family: monospace;
                font-size: 14px; color: var(--text-color-primary); white-space: nowrap;
                overflow: hidden; text-overflow: ellipsis;
            }
            .result__copy-button {
                flex-shrink: 0; padding: 0 15px; background-color: var(--button-primary-bg);
                color: white; border: none; border-radius: 8px; cursor: pointer;
                transition: background-color var(--transition-speed);
            }
            .result__copy-button:hover { background-color: var(--button-primary-hover-bg); }
            .result__copy-button.copied { background-color: var(--success-color); }
            .status-message {
                font-size: 14px; text-align: center; display: none;
                padding: 8px; border-radius: 8px; margin-top: 10px;
            }
            .status-message.error { background-color: rgba(255, 130, 130, 0.2); color: var(--error-color); display: block; }
            .status-message.success { background-color: rgba(40, 167, 69, 0.2); color: #a1ffb9; display: block; }
            @media (max-width: 600px) {
                body { align-items: flex-start; padding-top: 5vh; }
                .card { padding: 20px; gap: 20px; }
                .card__title { font-size: 22px; }
                .form__controls-grid, .advanced-options { grid-template-columns: 1fr; }
            }
        </style>
    </head>
    <body>

        <main class="card">
            <header class="card__header">
          <svg class="card__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 1-9 9H3.5a2.5 2.5 0 0 1 0-5H9"/><path d="M3 12a9 9 0 0 1 9-9h8.5a2.5 2.5 0 0 1 0 5H12"/></svg>
                <h1 class="card__title">SubConvert-Worker</h1>
            </header>

            <form id="conversion-form" novalidate>
                <div class="form__group">
                    <label for="sub-url" class="form__label">订阅链接</label>
                    <textarea id="sub-url" class="form__input" placeholder="在此输入一个或多个订阅链接，每行一个" required></textarea>
                </div>

                <div class="form__controls-grid">
                    <div class="form__group">
                        <label for="target-type" class="form__label">目标格式</label>
                        <select id="target-type" class="form__select">
                            <option value="clash">Clash</option>
                            <option value="v2ray">V2Ray</option>
                        </select>
                    </div>
                    <div class="form__group">
                        <label class="form__label">&nbsp;</label>
                        <button type="button" id="toggle-advanced" class="form__button form__button--secondary">高级选项</button>
                    </div>
                </div>

                <div id="advanced-options" class="advanced-options">
                    <div class="form__group">
                        <label for="user-agent" class="form__label">User-Agent</label>
                        <select id="user-agent" class="form__select">
                            <option value="default">默认</option>
                            <option value="chrome">Chrome</option>
                            <option value="firefox">Firefox</option>
                            <option value="ios">iOS</option>
                            <option value="android">Android</option>
                        </select>
                    </div>
                    <div class="form__group">
                        <label class="form__label">其他设置</label>
                        <div class="checkbox-group">
                            <input type="checkbox" id="strict-mode" name="strict-mode">
                            <label for="strict-mode">严格模式</label>
                        </div>
                        <div class="checkbox-group">
                            <input type="checkbox" id="test-only" name="test-only">
                            <label for="test-only">仅测试</label>
                        </div>
                    </div>
                </div>

                <button type="submit" id="convert-button" class="form__button form__button--primary">生成订阅链接</button>
            </form>
            
            <div id="status-message" class="status-message"></div>

            <div id="result-area" class="result-area">
                <h2 class="result__title">转换结果</h2>
                <div class="result__output-wrapper">
                    <input type="text" id="result-output" class="result__output" readonly>
                    <button type="button" id="copy-button" class="result__copy-button">复制</button>
                </div>
            </div>
        </main>

        <script>
        document.addEventListener('DOMContentLoaded', () => {
            const form = document.getElementById('conversion-form');
            const subUrlInput = document.getElementById('sub-url');
            const targetTypeSelect = document.getElementById('target-type');
            const toggleAdvancedButton = document.getElementById('toggle-advanced');
            const advancedOptionsContainer = document.getElementById('advanced-options');
            const convertButton = document.getElementById('convert-button');
            const resultArea = document.getElementById('result-area');
            const resultOutput = document.getElementById('result-output');
            const copyButton = document.getElementById('copy-button');
            const statusMessage = document.getElementById('status-message');
            const userAgentSelect = document.getElementById('user-agent');
            const strictModeCheckbox = document.getElementById('strict-mode');
            const testOnlyCheckbox = document.getElementById('test-only');

            toggleAdvancedButton.addEventListener('click', () => {
                const isVisible = advancedOptionsContainer.classList.toggle('visible');
                toggleAdvancedButton.textContent = isVisible ? '收起高级选项' : '高级选项';
            });

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const subUrl = subUrlInput.value.trim();
                if (!subUrl) {
                    showStatus('订阅链接不能为空。', 'error');
                    return;
                }

                setLoadingState(true);
                hideStatus();
                resultArea.classList.remove('visible');
                
                const encodedUrl = encodeURIComponent(subUrl);
                const target = targetTypeSelect.value;
                const ua = userAgentSelect.value;
                const strict = strictModeCheckbox.checked;
                const testOnly = testOnlyCheckbox.checked;

                const params = new URLSearchParams({
                    target,
                    url: encodedUrl,
                    ua,
                    strict,
                    testOnly,
                });

                const requestUrl = \`\${location.origin}/sub?\${params.toString()}\`;

                if (testOnly) {
                    try {
                        const response = await fetch(requestUrl);
                        const data = await response.json();
                        if (!response.ok) throw new Error(data.msg || '测试请求失败');
                        
                        showStatus(\`测试通过！共发现 \${data.extra.nodeCount} 个节点，其中有效节点 \${data.extra.validNodeCount} 个。\`, 'success');
                    } catch (error) {
                        console.error('Test failed:', error);
                        showStatus(error.message, 'error');
                    } finally {
                        setLoadingState(false);
                    }
                } else {
                    showResult(requestUrl);
                    setLoadingState(false);
                }
            });

            copyButton.addEventListener('click', () => {
                if (!resultOutput.value) return;
                navigator.clipboard.writeText(resultOutput.value).then(() => {
                    const originalText = copyButton.textContent;
                    copyButton.textContent = '已复制!';
                    copyButton.classList.add('copied');
                    setTimeout(() => {
                        copyButton.textContent = originalText;
                        copyButton.classList.remove('copied');
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                    showStatus('复制失败，您的浏览器可能不支持或禁止了该操作。', 'error');
                });
            });

            function showResult(url) {
                resultOutput.value = url;
                resultArea.classList.add('visible');
            }
            
            function showStatus(message, type = 'error') {
                statusMessage.textContent = message;
                statusMessage.className = \`status-message \${type}\`;
            }
            
            function hideStatus() {
                statusMessage.className = 'status-message';
            }
            
            function setLoadingState(isLoading) {
                convertButton.disabled = isLoading;
                convertButton.textContent = isLoading ? '处理中...' : '生成订阅链接';
            }
        });
        </script>
    </body>
    </html>
    `;

  if (pathname === '/favicon.ico') {
    return Responses.normal(favIcon, 200, { 'Cache-Control': 'public, max-age=86400' }, 'image/svg+xml');
  }

  if (pathname === '/robots.txt') {
    return Responses.normal('User-agent: *\nDisallow: /\n', 200, { 'Cache-Control': 'public, max-age=86400' }, 'text/plain');
  }

  if (pathname === '/ping') {
    return Responses.sub('pong', 200);
  }

  if (pathname === '/') {
    return Responses.normal(index, 200, { 'Cache-Control': 'public, max-age=86400' }, 'text/html');
  }

  return null;
}