/*
 * Velrix embeddable chat widget.
 * Usage: <script src="https://YOUR_HOST/widget.js" data-velrix-key="web_xxx" async></script>
 * Self-contained, no dependencies. Talks to /api/widget/* on the script's origin.
 */
(function () {
  "use strict";
  if (window.__velrixLoaded) return;
  window.__velrixLoaded = true;
  var script = document.currentScript || (function () {
    var s = document.getElementsByTagName("script");
    return s[s.length - 1];
  })();
  var KEY = script.getAttribute("data-velrix-key");
  if (!KEY) { console.warn("[Velrix] missing data-velrix-key"); return; }
  var HOST = (script.getAttribute("data-velrix-host") || new URL(script.src).origin).replace(/\/$/, "");

  var token = null;
  var since = null;
  var open = false;
  var polling = null;
  var seen = {};
  var cfg = { agentName: "Velrix", businessName: "", accent: "#0891b2", position: "right", welcomeMessage: "Hi! How can I help you today?", showBranding: true };

  function api(path, method, body) {
    return fetch(HOST + path, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) { return r.json().catch(function () { return {}; }); });
  }

  var el = {};
  function css() {
    var s = document.createElement("style");
    s.textContent =
      ".vlx-btn{position:fixed;bottom:20px;" + cfg.position + ":20px;width:58px;height:58px;border-radius:50%;background:" + cfg.accent + ";color:#fff;border:none;cursor:pointer;box-shadow:0 8px 30px -6px rgba(0,0,0,.5);z-index:2147483000;display:flex;align-items:center;justify-content:center;transition:transform .15s}" +
      ".vlx-btn:hover{transform:scale(1.06)}" +
      ".vlx-panel{position:fixed;bottom:88px;" + cfg.position + ":20px;width:370px;max-width:calc(100vw - 32px);height:540px;max-height:calc(100vh - 120px);background:#0b0f16;color:#e9eef6;border:1px solid rgba(255,255,255,.1);border-radius:16px;box-shadow:0 24px 60px -12px rgba(0,0,0,.6);z-index:2147483000;display:none;flex-direction:column;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}" +
      ".vlx-panel.open{display:flex;animation:vlxUp .25s ease}" +
      "@keyframes vlxUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}" +
      ".vlx-head{padding:15px 16px;background:linear-gradient(180deg," + cfg.accent + ",rgba(0,0,0,.05));display:flex;align-items:center;gap:10px}" +
      ".vlx-dot{width:8px;height:8px;border-radius:50%;background:#34d399;box-shadow:0 0 8px #34d399}" +
      ".vlx-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:9px;background:#070a0f}" +
      ".vlx-msg{max-width:82%;padding:9px 12px;border-radius:13px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-break:break-word}" +
      ".vlx-c{align-self:flex-end;background:" + cfg.accent + ";color:#fff;border-bottom-right-radius:4px}" +
      ".vlx-a{align-self:flex-start;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.09);border-bottom-left-radius:4px}" +
      ".vlx-foot{padding:10px;border-top:1px solid rgba(255,255,255,.08);display:flex;gap:7px;background:#0b0f16}" +
      ".vlx-in{flex:1;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 11px;color:#e9eef6;font-size:14px;outline:none}" +
      ".vlx-send{background:" + cfg.accent + ";border:none;color:#fff;border-radius:10px;padding:0 14px;cursor:pointer;font-weight:600}" +
      ".vlx-send:disabled{opacity:.5;cursor:default}" +
      ".vlx-brand{text-align:center;font-size:11px;color:#8b96a8;padding:6px}" +
      ".vlx-brand a{color:#8b96a8;text-decoration:none}";
    document.head.appendChild(s);
  }

  function build() {
    var btn = document.createElement("button");
    btn.className = "vlx-btn";
    btn.setAttribute("aria-label", "Chat");
    btn.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    btn.onclick = toggle;

    var panel = document.createElement("div");
    panel.className = "vlx-panel";
    panel.innerHTML =
      '<div class="vlx-head"><span class="vlx-dot"></span><div style="flex:1"><div style="font-weight:700;font-size:15px">' + esc(cfg.agentName) + '</div><div style="font-size:12px;opacity:.85">' + esc(cfg.businessName) + '</div></div><button class="vlx-x" aria-label="Close" style="background:none;border:none;color:#fff;cursor:pointer;font-size:20px;opacity:.8">×</button></div>' +
      '<div class="vlx-body"></div>' +
      (cfg.showBranding ? '<div class="vlx-brand">Powered by <a href="' + HOST + '" target="_blank" rel="noopener">Velrix</a></div>' : "") +
      '<div class="vlx-foot"><input class="vlx-in" placeholder="Type a message…" /><button class="vlx-send">Send</button></div>';

    document.body.appendChild(btn);
    document.body.appendChild(panel);
    el.btn = btn; el.panel = panel;
    el.body = panel.querySelector(".vlx-body");
    el.input = panel.querySelector(".vlx-in");
    el.send = panel.querySelector(".vlx-send");
    panel.querySelector(".vlx-x").onclick = toggle;
    el.send.onclick = onSend;
    el.input.addEventListener("keydown", function (e) { if (e.key === "Enter") onSend(); });
  }

  function esc(s) { var d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

  function add(text, who) {
    var m = document.createElement("div");
    m.className = "vlx-msg " + (who === "c" ? "vlx-c" : "vlx-a");
    m.textContent = text;
    el.body.appendChild(m);
    el.body.scrollTop = el.body.scrollHeight;
  }

  function toggle() {
    open = !open;
    el.panel.classList.toggle("open", open);
    if (open) {
      if (!el.body.dataset.greeted) { add(cfg.welcomeMessage, "a"); el.body.dataset.greeted = "1"; }
      el.input.focus();
      startPolling();
    } else {
      stopPolling();
    }
  }

  function onSend() {
    var text = el.input.value.trim();
    if (!text) return;
    el.input.value = "";
    add(text, "c");
    el.send.disabled = true;
    var p = token
      ? api("/api/widget/message", "POST", { publicKey: KEY, conversationToken: token, message: text })
      : api("/api/widget/start", "POST", { publicKey: KEY, message: text });
    p.then(function (res) {
      el.send.disabled = false;
      if (res && res.conversationToken) token = res.conversationToken;
      if (res && res.error) { add("Sorry, something went wrong. Please try again.", "a"); return; }
      if (res && res.reply) { add(res.reply, "a"); }
      else if (res && res.humanActive) { add("A team member will reply here shortly.", "a"); }
      since = new Date().toISOString();
    }).catch(function () { el.send.disabled = false; add("Network error. Please try again.", "a"); });
  }

  function startPolling() {
    if (polling) return;
    polling = setInterval(function () {
      if (!token) return;
      api("/api/widget/poll?publicKey=" + encodeURIComponent(KEY) + "&token=" + encodeURIComponent(token) + (since ? "&since=" + encodeURIComponent(since) : ""), "GET")
        .then(function (res) {
          if (res && res.error) {
            // Unknown/removed widget or conversation — stop polling to avoid hammering.
            if (res.error.code === "not_found") stopPolling();
            return;
          }
          if (!res || !res.messages) return;
          res.messages.forEach(function (m) {
            if (seen[m.id]) return;
            seen[m.id] = 1;
            add(m.body, "a");
            since = m.createdAt;
          });
        }).catch(function () {});
    }, 4000);
  }
  function stopPolling() { if (polling) { clearInterval(polling); polling = null; } }

  api("/api/widget/config?publicKey=" + encodeURIComponent(KEY), "GET").then(function (c) {
    if (c && !c.error) cfg = Object.assign(cfg, c);
    css();
    build();
  }).catch(function () { css(); build(); });
})();
