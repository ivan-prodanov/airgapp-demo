// Airgapp demo. The console's preview server runs inside this page (WebAssembly) and answers the
// console's /api calls, so the demo needs no server and nothing leaves the browser. Every page load
// starts with fresh pretend data. Loaded before the console's own scripts.
(() => {
  const realFetch = window.fetch.bind(window);
  const ready = (async () => {
    const go = new Go();
    const { instance } = await WebAssembly.instantiateStreaming(realFetch('/demo.wasm'), go.importObject);
    go.run(instance);
    while (!window.__airgappHandle) await new Promise(r => setTimeout(r, 5));
  })();
  const NO_BODY = new Set([101, 103, 204, 205, 304]);
  window.fetch = async (input, init = {}) => {
    const req = input instanceof Request ? input : null;
    const url = new URL(req ? req.url : String(input), location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return realFetch(input, init);
    await ready;
    const method = String(init.method || (req && req.method) || 'GET').toUpperCase();
    const headers = Object.fromEntries(new Headers(init.headers || (req && req.headers) || {}));
    let body = init.body ?? (req && method !== 'GET' && method !== 'HEAD' ? await req.text() : null);
    if (body != null && typeof body !== 'string') body = await new Response(body).text();
    const r = await window.__airgappHandle(method, url.pathname + url.search, JSON.stringify(headers), body ?? '');
    const res = new Response(NO_BODY.has(r.status) ? null : r.body, { status: r.status, headers: JSON.parse(r.headers) });
    Object.defineProperty(res, 'url', { value: url.href });
    return res;
  };

  let framed = true;
  try { framed = window.top !== window.self; } catch { framed = true; }
  const css = framed
    // In the landing page's car screen: no scrollbars, like the car's own browser.
    ? '*{scrollbar-width:none!important}*::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}'
    // On its own: a tag in the empty end of the top bar that says what this is (just the pill on
    // smaller screens); it scrolls away with the page and never takes a tap.
    : '.airgapp-demo-tag{position:absolute;right:clamp(16px,3vw,40px);top:18px;z-index:9999;display:flex;align-items:center;gap:10px;font:600 10.5px/1 "Martian Mono",ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#EAF0F7;background:rgba(12,17,27,.92);border:1px solid rgba(132,164,205,.26);border-radius:999px;padding:6px 14px 6px 6px;box-shadow:0 12px 30px rgba(0,0,0,.5);pointer-events:none}.airgapp-demo-tag b{color:#fff;background:#e02434;border-radius:999px;padding:5px 9px;letter-spacing:.16em}.airgapp-demo-tag span{color:#93A1B5;letter-spacing:.06em}@media(max-width:860px){.airgapp-demo-tag{padding:0;border:0;background:none;box-shadow:none;top:20px}.airgapp-demo-tag span{display:none}}';
  const style = document.createElement('style'); style.textContent = css; document.head.append(style);
  if (!framed) {
    const tag = () => { if (document.querySelector('.airgapp-demo-tag')) return; const t = document.createElement('div'); t.className = 'airgapp-demo-tag'; t.innerHTML = '<b>Demo</b><span>Pretend data · resets on reload</span>'; document.body.append(t); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tag); else tag();
  }
})();
