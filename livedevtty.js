// --- Injected CSS Styles ---
const LDT_STYLES = `
#ldt-trace-lvl {
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 10000;
    padding: 6px 12px;
    background-color: #2d2d2d;
    color: #cccccc;
    border: 1px solid #555;
    border-radius: 4px;
    font-family: monospace;
    font-size: 13px;
    cursor: pointer;
    outline: none;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

#ldt-trace-lvl:hover {
    background-color: #3d3d3d;
}

.ldt-terminal-host{
  position: fixed;
  inset: 0;                 /* top:0; right:0; bottom:0; left:0 */
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}
.ldt-terminal{
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}
.ldt-terminal .xterm,
.ldt-terminal .xterm-viewport,
.ldt-terminal .xterm-screen{ padding-left: 4px; height: 100% !important }
.ldt-terminal .xterm-viewport{ background: transparent !important }

.ldt-conn-indicator{
  position:fixed; top:1px; right:10px;
  padding:6px 12px; border-radius:4px;
  font-family:sans-serif; font-size:12px; line-height:1;
  z-index:9999; box-shadow:0 2px 10px rgba(0,0,0,.5);
  display:inline-flex; align-items:center; gap:6px;
  white-space:nowrap; user-select:none;
  /* default = connected */
  background-color:rgba(80,250,123,.1);
  border:1px solid #50fa7b; color:#50fa7b;
}
.ldt-conn-indicator::before{
  content:""; width:7px; height:7px; border-radius:50%;
  background:currentColor; flex-shrink:0;
}
/* in-flight pulse */
@keyframes ldt-pulse{ 0%,100%{ opacity:1 } 50%{ opacity:.35 } }
.ldt-conn-indicator.connecting::before,
.ldt-conn-indicator.reconnecting::before{
  animation:ldt-pulse 1.1s ease-in-out infinite;
}

/* error: ring flashes twice on entry */
@keyframes ldt-flash{
  0%,100%{ box-shadow:0 2px 10px rgba(0,0,0,.5) }
  50%  { box-shadow:0 2px 10px rgba(0,0,0,.5), 0 0 0 4px rgba(255,85,85,.25) }
}
.ldt-conn-indicator.error{ animation:ldt-flash 1.4s ease-in-out 2 }

/* state variants */
.ldt-conn-indicator.connected   { background-color:rgba( 80,250,123,.10); border-color:#50fa7b; color:#50fa7b }
.ldt-conn-indicator.connecting  { background-color:rgba(139,233,253,.10); border-color:#8be9fd; color:#8be9fd }
.ldt-conn-indicator.reconnecting{ background-color:rgba(241,250,140,.10); border-color:#f1fa8c; color:#f1fa8c }
.ldt-conn-indicator.disconnected{ background-color:rgba(255,184,108,.10); border-color:#ffb86c; color:#ffb86c }
.ldt-conn-indicator.error       { background-color:rgba(255, 85, 85,.12); border-color:#ff5555; color:#ff5555 }
.ldt-conn-indicator.idle        { background-color:rgba( 98,114,164,.12); border-color:#6272a4; color:#6272a4 }

.b-ind { writing-mode:vertical-rl; color:#aaa; font-size:8px; text-align:center; cursor:pointer; width: 8px; user-select:none; z-index: 99; }
.b-ind.connected   { background-color:rgba( 80,250,123,.10); border-color:#50fa7b; color:#50fa7b }
.b-ind.connecting  { background-color:rgba(139,233,253,.10); border-color:#8be9fd; color:#8be9fd }
.b-ind.reconnecting{ background-color:rgba(241,250,140,.10); border-color:#f1fa8c; color:#f1fa8c }
.b-ind.disconnected{ background-color:rgba(255,184,108,.10); border-color:#ffb86c; color:#ffb86c }
.b-ind.error       { background-color:rgba(255, 85, 85,.12); border-color:#ff5555; color:#ff5555 }
.b-ind.idle        { background-color:rgba( 98,114,164,.12); border-color:#6272a4; color:#6272a4 }

/* Hidden by default, only shown in badge-mode */
#badge-container {
    font-family: Tahoma, Verdana, sans-serif; font-size: 7px;
    font-smooth: never;
    font-synthesis-weight: none;
    -webkit-font-smoothing: none;
    align-items: stretch;
    justify-content: flex-start;
    background: #1e1e1e;
    border-color: #555;
    display: none;
    width: 88px;
    height: 31px;
}

body.badge-mode #badge-container {
    display: flex;
}

/* PURE CSS BADGE MODE: Instantly triggers when iframe/window resizes */
@media screen and (max-width: 120px) and (max-height: 60px) {
    body {
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: transparent !important;
    }

    /* Instantly hide ALL direct children of the body EXCEPT the badge */
    body > *:not(#badge-container):not(.badge-content) {
        display: none !important;
    }

    /* Force the badge to display */
    #badge-container {
        display: flex !important;
    }
}
`;

(function injectStyles() {
    if (document.getElementById('ldt-injected-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'ldt-injected-styles';
    styleEl.textContent = LDT_STYLES;
    document.head.appendChild(styleEl);
})();

async function loadXtermDependencies() {
    return new Promise((resolve, reject) => {
        // If xterm is already loaded, resolve immediately
        if (typeof window.Terminal !== 'undefined') {
            return resolve();
        }

        // Load CSS if not present
        if (!document.querySelector("link[href*='xterm.css']")) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/@xterm/xterm/css/xterm.css';
            document.head.appendChild(link);
        }

        // Load JS if not present
        if (!document.querySelector("script[src*='xterm.js']")) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@xterm/xterm/lib/xterm.js';

            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load xterm.js from CDN"));

            document.head.appendChild(script);
        } else {
            // The script tag exists but hasn't finished loading yet.
            // We poll briefly until window.Terminal is available.
            const checkReady = setInterval(() => {
                if (typeof window.Terminal !== 'undefined') {
                    clearInterval(checkReady);
                    resolve();
                }
            }, 50);
        }
    });
}

// --- State & DOM References ---
const uiState = {
    indicator: null,
    badgeStatus: null,
    isInitialized: false
};

// --- UI Initialization & Updates ---
function updateFavicon(iconChar) {
    const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${iconChar}</text></svg>`;
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = 'data:image/svg+xml,' + encodeURIComponent(rawSvg);
    document.head.appendChild(link);
}

function initUI() {
    if (uiState.indicator) return;

    uiState.indicator = document.createElement('div');
    if (document.body.firstChild) {
        document.body.insertBefore(uiState.indicator, document.body.firstChild);
    } else {
        document.body.appendChild(uiState.indicator);
    }

    const favicon = document.querySelector('title')?.dataset.icon;
    if (favicon) updateFavicon(favicon);

    const title = document.title;
    document.body.insertAdjacentHTML('afterbegin', `
        <div id="badge-container">
            <div id="b-st" class="b-ind">${title}</div>
        </div>
    `);

    uiState.badgeStatus = document.getElementById('b-st');
}

function setStatus(state, msg) {
    initUI();
    uiState.badgeStatus.className = `b-ind ${state}`;
    uiState.indicator.className = `ldt-conn-indicator ${state}`;
    uiState.indicator.textContent = msg || state;
}

// --- Feature: Trace Level Selector ---
function setupTraceSelector() {
    const traceSelector = document.getElementById('ldt-trace-lvl');
    if (!traceSelector) return;

    const urlParams = new URLSearchParams(window.location.search);
    const currentLvl = urlParams.get('lvl');
    if (currentLvl) traceSelector.value = currentLvl;

    traceSelector.addEventListener('change', (e) => {
        window.__is_navigating = true;
        window.stop();
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('lvl', e.target.value);
        window.location.href = newUrl.toString();
    });
}

function setupTerminal() {
    setStatus("connected");

    // Create terminal DOM elements
    const host = document.createElement('div');
    host.className = 'ldt-terminal-host badge-content';
    const term = document.createElement('div');
    term.id = "log-display";
    term.className = 'ldt-terminal';
    host.appendChild(term);

    if (document.body.firstChild) {
        document.body.insertBefore(host, document.body.firstChild);
    } else {
        document.body.appendChild(host);
    }

    // Init xterm
    const xtermInstance = new Terminal({
        convertEol: true,
        scrollback: 50000,
        disableStdin: true,
        cursorBlink: false,
        fontSize: 12,
        fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
        theme: { background: 'transparent', foreground: '#dddddd' },
    });
    xtermInstance.open(term);

    // Manual Fit Hack (Dependency-free)
	const fitToHost = () => {
        const isBadgeMode = term.clientWidth <= 120;
        const targetFontSize = isBadgeMode ? 4 : 12;
        if (xtermInstance.options.fontSize !== targetFontSize) {
            xtermInstance.options.fontSize = targetFontSize;
        }
        const core   = xtermInstance._core;
        const cellW  = core?._renderService?.dimensions?.css?.cell?.width  || (isBadgeMode ? 3.3 : 7.2);
        const cellH  = core?._renderService?.dimensions?.css?.cell?.height || (isBadgeMode ? 7 : 16);
        const minCols = isBadgeMode ? 12 : 20;
        const minRows = isBadgeMode ? 3 : 5;
        const cols   = Math.max(minCols, Math.floor(term.clientWidth  / cellW));
        const rows   = Math.max(minRows, Math.floor(term.clientHeight / cellH));

        if (cols !== xtermInstance.cols || rows !== xtermInstance.rows) {
            try { xtermInstance.resize(cols, rows); } catch(e) {}
        }
    };

    fitToHost();
    new ResizeObserver(fitToHost).observe(term);
    return xtermInstance;
}

async function streamToTerminal(xtermInstance, url, startMarker, webconsole) {
    try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.body) {
            throw new Error("ReadableStream not supported in this browser.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        let isSeeking = true;
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break; // Stream ended normally
            }

            let chunk = decoder.decode(value, { stream: true });

            if (isSeeking) {
                buffer += chunk;
                const markerIndex = buffer.indexOf(startMarker);

                if (markerIndex !== -1) {
                    isSeeking = false;
                    // Extract everything AFTER the marker and write it
                    const contentStart = markerIndex + startMarker.length;
                    const initialContent = buffer.substring(contentStart);
                    if (initialContent) {
                        xtermInstance.write(initialContent);
                        if (webconsole) {
                            console.log(initialContent);
                        }
                    }
                    buffer = "";
                }
            } else {
                xtermInstance.write(chunk);
                if (webconsole) {
                    console.log(chunk);
                }
            }
        }

        // Trigger reconnection logic when the stream closes cleanly
        handleStreamEnd();

    } catch (error) {
        console.error("Stream interrupted or failed:", error);
        handleStreamEnd();
    }
}


// --- Lifecycle & Initialization ---
async function activateLive(id, webconsole) {
    setupTraceSelector();

    if (!document.body) {
        document.documentElement.appendChild(document.createElement("body"));
    }
    await loadXtermDependencies();
    uiState.isInitialized = true;
    window.stop(); // Stop the browser from continuing to load the main page

    // Setup the terminal UI immediately
    const xtermInstance = setupTerminal(id);

    // Call the extracted stream function
    // You can dynamically set the startMarker based on the 'id' if needed
    const startMarker = "<body>" + "<xmp id='log'>";
    await streamToTerminal(xtermInstance, window.location.href, startMarker, webconsole);
}


function handleStreamEnd() {
    if (window.__is_navigating) return;
    console.log("Stream ended. Waiting for server to restart...");
    setStatus("disconnected");
    return pollServerAndReload();
}

function pollServerAndReload() {
    const interval = 750;
	let attempts = 1;
    const ping = () => {
		setStatus("reconnecting", "reconnecting - attempts " + attempts);
		attempts += 1;
        fetch(window.location.href, { cache: 'no-store' })
            .then(() => {
                setStatus("connecting", "server Up! reloading...");
                console.log("Server is up! Reloading...");
                window.location.reload();
            })
            .catch((_error) => {
				setStatus("error");
                return setTimeout(ping, interval + Math.min((attempts * (attempts / 2)) * 100, 60000));
            });
    };
    return setTimeout(ping, interval);
}

window.activateLive = activateLive;
window.activateLiveConsole = function(id) { window.activateLive(id, true); };
