// Google-AI-Studio-automation

// #automation-settings
(() => {
  const KEY = "aiStudioAutomation:settings:v1";
  const DEFAULTS = {
    allowAccess: { enabled: true, countdownMs: 3000 },
    retry: { enabled: true, countdownSec: 3 },
    autoFix: { enabled: true, countdownSec: 3 },
    promptChain: { interPromptDelayMs: 3000 }
  };

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const asNum = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

  const normalize = (raw) => {
    const s = raw && typeof raw === "object" ? raw : {};
    return {
      allowAccess: {
        enabled: s.allowAccess?.enabled !== false,
        countdownMs: clamp(asNum(s.allowAccess?.countdownMs, DEFAULTS.allowAccess.countdownMs), 0, 300000)
      },
      retry: {
        enabled: s.retry?.enabled !== false,
        countdownSec: clamp(asNum(s.retry?.countdownSec, DEFAULTS.retry.countdownSec), 0, 120)
      },
      autoFix: {
        enabled: s.autoFix?.enabled !== false,
        countdownSec: clamp(asNum(s.autoFix?.countdownSec, DEFAULTS.autoFix.countdownSec), 0, 120)
      },
      promptChain: {
        interPromptDelayMs: clamp(
          asNum(s.promptChain?.interPromptDelayMs, DEFAULTS.promptChain.interPromptDelayMs),
          0,
          300000
        )
      }
    };
  };

  const mergeDeep = (base, patch) => {
    if (!patch || typeof patch !== "object") return base;
    const out = { ...base };
    Object.keys(patch).forEach((k) => {
      const pv = patch[k];
      if (pv && typeof pv === "object" && !Array.isArray(pv)) {
        out[k] = mergeDeep(base[k] || {}, pv);
      } else {
        out[k] = pv;
      }
    });
    return out;
  };

  const loadRaw = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch {
      return {};
    }
  };

  const get = () => normalize(loadRaw());

  const set = (patch) => {
    const merged = mergeDeep(get(), patch || {});
    const normalized = normalize(merged);
    try {
      localStorage.setItem(KEY, JSON.stringify(normalized));
    } catch {}
    window.__aiStudioAutomationSettings = normalized;
    return normalized;
  };

  if (!window.__aiStudioAutomationSettings) {
    const initial = get();
    if (!localStorage.getItem(KEY)) {
      try {
        localStorage.setItem(KEY, JSON.stringify(initial));
      } catch {}
    }
    window.__aiStudioAutomationSettings = initial;
  }

  window.__aiStudioAutomationGet = () => {
    try {
      const normalized = get();
      window.__aiStudioAutomationSettings = normalized;
      return normalized;
    } catch {
      return window.__aiStudioAutomationSettings || normalize({});
    }
  };

  window.__aiStudioAutomationSave = (patch) => set(patch);
  window.__aiStudioAutomationDefaults = DEFAULTS;
})();

// #download-zip
(() => {
  const ROOT_ID = "dlb-root";
  const CSS_ID = "dlb-style";

  const HOTKEY = { alt: true, key: "d" }; // Alt+D

  // AI Studio mounts the real download control only in some panel/menu states.
  // Keep this broad, but never target this helper's own overlay.
  const downloadBtnSelector =
    [
      'button[aria-label="Download app"][iconname="download"]',
      'button[aria-label="Download app"]',
      'button[aria-label*="Download"][aria-label*="app"]',
      'button[aria-label*="Download"]',
      'button[iconname="download"]',
      'button[iconname="download_app"]',
      '[role="button"][aria-label*="Download"]',
      '[role="menuitem"][aria-label*="Download"]',
      'button mat-icon',
      'button .material-symbols-outlined',
      'button .ms-button-icon-symbol'
    ].join(", ");

  const isVisible = (el) =>
    !!el &&
    el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== "hidden" &&
    getComputedStyle(el).display !== "none";

  const closestClickable = (el) =>
    el?.closest?.("button, [role='button'], [role='menuitem'], a[href]") || el;

  const findDownloadBtn = () => {
    for (const node of document.querySelectorAll(downloadBtnSelector)) {
      const btn = closestClickable(node);
      if (!btn || btn.closest?.(`#${ROOT_ID}`)) continue;
      if (!isVisible(btn)) continue;
      const haystack = [
        btn.getAttribute("aria-label"),
        btn.getAttribute("title"),
        btn.textContent,
        node.textContent
      ].join(" ");
      if (/download/i.test(haystack)) return btn;
    }
    return null;
  };

  const toast = (msg) => {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = `
      position: fixed; right: 18px; bottom: 160px; z-index: 2147483647;
      background: rgba(30,30,30,.92); color: #fff; padding: 10px 12px;
      border-radius: 12px; font: 12px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial;
      box-shadow: 0 10px 30px rgba(0,0,0,.35);
      max-width: 360px;
    `;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  };

  const overlayHost = () => document.documentElement || document.body;

  const pinRoot = (root) => {
    if (!root) return root;
    root.removeAttribute("hidden");
    Object.assign(root.style, {
      position: "fixed",
      right: "18px",
      bottom: "86px",
      zIndex: "2147483647",
      display: "block",
      visibility: "visible",
      opacity: "1",
      pointerEvents: "auto"
    });
    return root;
  };

  function ensureStyles() {
    if (document.getElementById(CSS_ID)) return;
    const s = document.createElement("style");
    s.id = CSS_ID;
    s.textContent = `
      #${ROOT_ID}{
        position: fixed; right: 18px; bottom: 86px; z-index: 2147483647;
        display:block;
      }
      #${ROOT_ID} .dlb-btn{
        width: 54px; height: 54px; border-radius: 16px;
        background: rgba(20,20,20,.92); color:#fff;
        border: 1px solid rgba(255,255,255,.10);
        box-shadow: 0 12px 32px rgba(0,0,0,.38);
        cursor:pointer; user-select:none;
        display:flex; align-items:center; justify-content:center;
        font: 20px/1 system-ui, -apple-system, Segoe UI, Roboto, Arial;
      }
      #${ROOT_ID} .dlb-btn:hover{ transform: translateY(-1px); }
      #${ROOT_ID}[data-ready="false"] .dlb-btn{
        opacity:.78; border-color:rgba(251,191,36,.45);
      }
      #${ROOT_ID} .dlb-tip{
        margin-top: 8px; text-align:right;
        font: 11px/1.2 system-ui; opacity:.75;
        max-width: 160px;
      }
    `;
    document.head.appendChild(s);
  }

  function ensureUI() {
    ensureStyles();
    let root = document.getElementById(ROOT_ID);
    if (root) return root;

    root = document.createElement("div");
    root.id = ROOT_ID;
    pinRoot(root);

    const btn = document.createElement("div");
    btn.className = "dlb-btn";
    btn.title = "Download app (Alt+D)";
    btn.textContent = "⬇︎";
    Object.assign(btn.style, {
      width: "54px",
      height: "54px",
      borderRadius: "16px",
      background: "rgba(20,20,20,.92)",
      color: "#fff",
      border: "1px solid rgba(255,255,255,.10)",
      boxShadow: "0 12px 32px rgba(0,0,0,.38)",
      cursor: "pointer",
      userSelect: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      font: "20px/1 system-ui, -apple-system, Segoe UI, Roboto, Arial"
    });
    btn.addEventListener("click", () => triggerDownload(true));

    const tip = document.createElement("div");
    tip.className = "dlb-tip";
    tip.textContent = "Alt + D";

    root.appendChild(btn);
    root.appendChild(tip);
    overlayHost().appendChild(root);
    return root;
  }

  function setOverlayVisible(v) {
    const root = ensureUI();
    pinRoot(root);
    root.dataset.ready = v ? "true" : "false";
    const tip = root.querySelector(".dlb-tip");
    if (tip) tip.textContent = v ? "Alt + D" : "open Code/menu";
  }

  function triggerDownload(fromUserGesture) {
    const dl = findDownloadBtn();
    if (!dl || !isVisible(dl)) {
      toast("Download button not found/visible.");
      return;
    }
    // Clicking must be in a user gesture context to avoid blockers
    if (!fromUserGesture) {
      toast("Press Alt+D or click the overlay to download.");
      return;
    }
    dl.scrollIntoView({ behavior: "smooth", block: "center" });
    dl.click();
    toast("Download triggered.");
  }

  // Watch visibility
  const mo = new MutationObserver(() => {
    const dl = findDownloadBtn();
    setOverlayVisible(!!dl && isVisible(dl));
  });
  mo.observe(document.body, { childList: true, subtree: true, attributes: true });
  const uiWatchTimer = setInterval(() => {
    const root = ensureUI();
    if (!root.isConnected) overlayHost().appendChild(root);
    const dl = findDownloadBtn();
    setOverlayVisible(!!dl && isVisible(dl));
  }, 1000);

  // Hotkey
  const onKeyDown = (e) => {
    const match = e.altKey && (e.key || "").toLowerCase() === HOTKEY.key;
    if (!match) return;
    e.preventDefault();
    triggerDownload(true); // trusted due to keypress
  };
  window.addEventListener("keydown", onKeyDown, true);

  // Boot
  ensureUI();
  const initial = findDownloadBtn();
  setOverlayVisible(!!initial && isVisible(initial));

  window.__dlbStop = () => {
    mo.disconnect();
    clearInterval(uiWatchTimer);
    window.removeEventListener("keydown", onKeyDown, true);
    document.getElementById(ROOT_ID)?.remove();
    document.getElementById(CSS_ID)?.remove();
    toast("Download overlay stopped.");
  };
  window.__dlbShow = () => {
    const dl = findDownloadBtn();
    setOverlayVisible(!!dl && isVisible(dl));
    return document.getElementById(ROOT_ID);
  };

  console.log("[dlb] Download overlay running. Click ⬇︎ or press Alt+D. Stop: window.__dlbStop()");
})();

// #allow-gdrive-access
(() => {
  // ===== CONFIG =====
  const BTN_TEXT = /Allow access/i;
  const BTN_SEL =
    "ms-auth-request-dialog button.ms-button-primary, button.ms-button-primary";

  const getAuto = () =>
    (window.__aiStudioAutomationGet && window.__aiStudioAutomationGet()) || {
      allowAccess: { enabled: true, countdownMs: 3000 }
    };

  const isAllowAccessEnabled = () => getAuto().allowAccess?.enabled !== false;
  const getAllowAccessCountdownMs = () => getAuto().allowAccess?.countdownMs ?? 3000;

  // ===== HELPERS =====
  const isVisible = (el) =>
    !!el &&
    el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== "hidden";

  const findAllowBtn = () => {
    const candidates = Array.from(document.querySelectorAll(BTN_SEL));
    return candidates.find(
      (b) => BTN_TEXT.test((b.textContent || "").trim()) && isVisible(b)
    );
  };

  // ===== COUNTDOWN UI =====
  let badge;
  const showBadge = (text) => {
    if (!badge) {
      badge = document.createElement("div");
      badge.style.cssText = [
        "position:fixed",
        "top:12px",
        "right:12px",
        "z-index:2147483647",
        "padding:10px 12px",
        "border-radius:10px",
        "font:12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        "background:rgba(0,0,0,.85)",
        "color:#fff",
        "box-shadow:0 8px 30px rgba(0,0,0,.25)",
        "user-select:none",
        "white-space:nowrap",
      ].join(";");
      document.documentElement.appendChild(badge);
    }
    badge.textContent = text;
  };

  const hideBadge = () => {
    if (badge) badge.remove();
    badge = null;
  };

  // ===== STATE =====
  let armed = true;
  let countdownTimer = null;
  let tickTimer = null;

  const cleanupCountdown = () => {
    if (countdownTimer) clearTimeout(countdownTimer);
    if (tickTimer) clearInterval(tickTimer);
    countdownTimer = null;
    tickTimer = null;
    hideBadge();
  };

  const startCountdownAndClick = (btn) => {
    if (!isAllowAccessEnabled()) return;
    if (!armed) return;
    armed = false;

    // Smoothly bring into view (optional)
    try { btn.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}

    const TIMEOUT_MS = getAllowAccessCountdownMs();
    const start = Date.now();
    const end = start + TIMEOUT_MS;

    const render = () => {
      const msLeft = Math.max(0, end - Date.now());
      const sLeft = (msLeft / 1000).toFixed(1);
      showBadge(`[auto-allow] Clicking in ${sLeft}s…`);
    };

    render();
    tickTimer = setInterval(render, 100);

    countdownTimer = setTimeout(() => {
      cleanupCountdown();
      const latestBtn = findAllowBtn();
      if (latestBtn) {
        console.log("[auto-allow] Clicking 'Allow access'");
        latestBtn.click();
      } else {
        console.log("[auto-allow] Button disappeared before click.");
      }
      // Re-arm so it can work again if popup reappears
      setTimeout(() => (armed = true), 500);
    }, TIMEOUT_MS);
  };

  // ===== WATCH DOM =====
  const mo = new MutationObserver(() => {
    if (!isAllowAccessEnabled()) {
      cleanupCountdown();
      return;
    }
    const btn = findAllowBtn();
    if (btn && armed && !countdownTimer) startCountdownAndClick(btn);
  });
  mo.observe(document.body, { childList: true, subtree: true, attributes: true });

  // Initial check (in case already visible)
  const initialBtn = findAllowBtn();
  if (initialBtn && isAllowAccessEnabled()) startCountdownAndClick(initialBtn);

  // ===== STOPPER =====
  window.__autoAllowStop = () => {
    mo.disconnect();
    cleanupCountdown();
    console.log("[auto-allow] Stopped.");
  };

  console.log(
    "[auto-allow] Watching for 'Allow access'. When detected, shows a 3s countdown then clicks. Stop via __autoAllowStop()."
  );
})();

// #retry-btn-auto
(() => {
  // ====== CONFIG ======
  const RESTORE_DELAY_MS = 2600;    // after click, restore text
  const RETRY_TEXT = "Retry";

  const textareaSelector =
    'ms-code-assistant-chat textarea[placeholder*="Make changes"], textarea[placeholder*="Make changes"], ' +
    'ms-applet-generator-form textarea[placeholder*="Describe an app"], textarea[placeholder*="Describe an app"], ' +
    'ms-code-assistant-chat textarea, textarea.cdk-textarea-autosize';
  const retryButtonSelector = "button.ms-button-primary.ms-button-small";

  // Only cut/restore if textarea has non-empty text
  const ONLY_IF_TEXTAREA_HAS_TEXT = true;

  const getAuto = () =>
    (window.__aiStudioAutomationGet && window.__aiStudioAutomationGet()) || {
      retry: { enabled: true, countdownSec: 3 }
    };
  const isRetryEnabled = () => getAuto().retry?.enabled !== false;
  const getRetryCountdownSec = () => getAuto().retry?.countdownSec ?? 3;

  // ====== HELPERS ======
  const isVisible = (el) =>
    !!el &&
    el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== "hidden" &&
    getComputedStyle(el).display !== "none" &&
    el.disabled !== true;

  const findTextarea = () => document.querySelector(textareaSelector);

  const findRetryButton = () =>
    Array.from(document.querySelectorAll(retryButtonSelector)).find((btn) => {
      const t = (btn.textContent || "").trim();
      return t === RETRY_TEXT && isVisible(btn);
    });

  const flash = (el) => {
    const prev = el.style.boxShadow;
    el.style.boxShadow = "0 0 0 4px rgba(255, 80, 80, .9)";
    setTimeout(() => (el.style.boxShadow = prev), 900);
  };

  // ====== COUNTDOWN UI ======
  let badgeEl = null;

  const removeBadge = () => {
    if (badgeEl && badgeEl.parentNode) badgeEl.parentNode.removeChild(badgeEl);
    badgeEl = null;
  };

  const ensureBadge = () => {
    if (badgeEl) return badgeEl;
    badgeEl = document.createElement("div");
    badgeEl.style.position = "fixed";
    badgeEl.style.zIndex = "2147483647";
    badgeEl.style.padding = "6px 10px";
    badgeEl.style.borderRadius = "999px";
    badgeEl.style.font = "12px/1.2 -apple-system, system-ui, Segoe UI, Roboto, sans-serif";
    badgeEl.style.background = "rgba(0,0,0,.85)";
    badgeEl.style.color = "#fff";
    badgeEl.style.boxShadow = "0 8px 24px rgba(0,0,0,.25)";
    badgeEl.style.pointerEvents = "none";
    document.documentElement.appendChild(badgeEl);
    return badgeEl;
  };

  const positionBadgeNear = (btn) => {
    const b = ensureBadge();
    const r = btn.getBoundingClientRect();
    // top-right of button, with a small offset
    const top = Math.max(8, r.top - 34);
    const left = Math.min(window.innerWidth - 8, r.right) - 10;
    b.style.top = `${top}px`;
    b.style.left = `${left}px`;
    b.style.transform = "translateX(-100%)"; // anchor to the right edge
  };

  // ====== STATE ======
  let armed = true;
  let countdownTimer = null;
  let restoreTimer = null;

  // pending:
  // {
  //   btn, original, selStart, selEnd,
  //   restored, clicked, countdownLeft
  // }
  let pending = null;

  const cutTextIntoPending = (btn, countdownSec) => {
    const ta = findTextarea();
    if (!ta) return false;

    const original = ta.value ?? "";
    if (ONLY_IF_TEXTAREA_HAS_TEXT && !original.trim()) return false;

    pending = {
      btn,
      original,
      selStart: ta.selectionStart,
      selEnd: ta.selectionEnd,
      restored: false,
      clicked: false,
      countdownLeft: countdownSec,
    };

    // CUT before retry click
    ta.value = "";
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    ta.dispatchEvent(new Event("change", { bubbles: true }));

    return true;
  };

  const restoreText = () => {
    if (!pending || pending.restored) return;
    const ta = findTextarea();
    if (!ta) return;

    ta.value = pending.original;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    ta.dispatchEvent(new Event("change", { bubbles: true }));

    try {
      ta.focus();
      ta.setSelectionRange(
        pending.selStart ?? pending.original.length,
        pending.selEnd ?? pending.original.length
      );
    } catch {}

    pending.restored = true;
    console.log("[auto-retry] Text restored.");
  };

  const cancelCountdown = (reason = "") => {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = null;
    removeBadge();
    if (reason) console.log(`[auto-retry] Countdown canceled: ${reason}`);
  };

  const startCountdownAndAutoClick = (btn) => {
    if (!isRetryEnabled()) return;
    // prevent reusing same DOM node repeatedly
    if (btn.dataset._autoRetryWatching === "1") return;
    btn.dataset._autoRetryWatching = "1";

    const countdownSec = getRetryCountdownSec();
    // stash + cut text immediately (requirement: before retry click)
    const didCut = cutTextIntoPending(btn, countdownSec);
    if (!didCut) {
      // Nothing to cut; still allow auto retry
      pending = {
        btn,
        original: "",
        selStart: 0,
        selEnd: 0,
        restored: true,
        clicked: false,
        countdownLeft: countdownSec,
      };
    }

    btn.scrollIntoView({ behavior: "smooth", block: "center" });
    flash(btn);

    console.log(`[auto-retry] Retry detected. Auto-clicking in ${countdownSec}s... (text cut + stashed)`);

    // show + update countdown
    const tick = () => {
      // if button vanished/hidden, cancel and restore immediately
      const liveBtn = findRetryButton();
      if (!liveBtn || liveBtn !== btn || !isVisible(btn)) {
        cancelCountdown("Retry button disappeared");
        // restore quickly if we had cut
        if (pending && !pending.restored) restoreText();
        pending = null;
        return;
      }

      positionBadgeNear(btn);
      ensureBadge().textContent = `Retry in ${pending.countdownLeft}s`;

      if (pending.countdownLeft <= 0) {
        cancelCountdown();

        // Auto click
        console.log("[auto-retry] Clicking Retry now.");
        try {
          btn.click(); // may be blocked by app logic, but we do it anyway as requested
          pending.clicked = true;
        } catch (e) {
          console.warn("[auto-retry] Click failed:", e);
        }

        // restore after delay
        if (restoreTimer) clearTimeout(restoreTimer);
        restoreTimer = setTimeout(() => {
          restoreText();
          pending = null;
        }, RESTORE_DELAY_MS);

        return;
      }

      pending.countdownLeft -= 1;
    };

    // initial draw at full value, then count down each second
    tick();
    countdownTimer = setInterval(tick, 1000);

    // small cooldown so we don't spam-start multiple countdowns
    armed = false;
    setTimeout(() => (armed = true), 1500);
  };

  // ====== OBSERVER ======
  const observer = new MutationObserver(() => {
    if (!isRetryEnabled()) {
      cancelCountdown("disabled");
      if (pending && !pending.restored) restoreText();
      pending = null;
      return;
    }
    if (!armed) return;

    // If we're already mid-countdown/click/restore, ignore new mutations
    if (pending && !pending.restored) return;

    const btn = findRetryButton();
    if (!btn) return;

    startCountdownAndAutoClick(btn);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });

  // ====== STOPPER ======
  window.__autoRetryStop = () => {
    observer.disconnect();
    cancelCountdown("stopped");
    if (restoreTimer) clearTimeout(restoreTimer);
    restoreTimer = null;

    // If we were holding cut text, restore immediately
    if (pending && !pending.restored) restoreText();
    pending = null;

    console.log("[auto-retry] Stopped.");
  };

  console.log("[auto-retry] Watching for Retry. When it appears: cut text, show 3s countdown, auto-click Retry, then restore text. Stop: window.__autoRetryStop()");
})();

// #auto-fix-automation
(() => {
  // ====== CONFIG ======
  const RESTORE_DELAY_MS = 2600;

  // Text variations (normal hyphen + non-breaking hyphen)
  const AUTO_FIX_TEXTS = new Set(["Auto-fix", "Auto-fix", "Autofix", "Auto fix"]);

  // Exact textarea path you provided
  const textareaSelector =
    'ms-code-assistant-chat textarea[placeholder*="Make changes"], textarea[placeholder*="Make changes"], ' +
    'ms-applet-generator-form textarea[placeholder*="Describe an app"], textarea[placeholder*="Describe an app"], ' +
    'body app-root ms-app ms-console-component ms-console-embed div.root ' +
    'div.console-left-panel.visible ms-code-assistant-chat div div.bottom-container ' +
    'div.input-container textarea, textarea.cdk-textarea-autosize';

  // Auto-fix lives in output container (your snippet)
  // We still select broadly, then filter by text + visibility.
  const autoFixButtonSelector =
    "ms-code-assistant-chat .output-container ms-autoscroll-container button.ms-button-primary.ms-button-small";

  const ONLY_IF_TEXTAREA_HAS_TEXT = true;

  const getAuto = () =>
    (window.__aiStudioAutomationGet && window.__aiStudioAutomationGet()) || {
      autoFix: { enabled: true, countdownSec: 3 }
    };
  const isAutoFixEnabled = () => getAuto().autoFix?.enabled !== false;
  const getAutoFixCountdownSec = () => getAuto().autoFix?.countdownSec ?? 3;

  // ====== HELPERS ======
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();

  const isVisible = (el) =>
    !!el &&
    el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== "hidden" &&
    getComputedStyle(el).display !== "none" &&
    el.getAttribute("aria-disabled") !== "true" &&
    el.disabled !== true;

  const findTextarea = () => document.querySelector(textareaSelector);

  const findAutoFixButton = () => {
    const all = Array.from(document.querySelectorAll(autoFixButtonSelector));
    return all.find((btn) => AUTO_FIX_TEXTS.has(norm(btn.textContent)) && isVisible(btn));
  };

  const flash = (el) => {
    const prev = el.style.boxShadow;
    el.style.boxShadow = "0 0 0 4px rgba(0, 200, 255, .9)";
    setTimeout(() => (el.style.boxShadow = prev), 900);
  };

  // Realistic pointer/mouse sequence
  const robustClick = (btn) => {
    if (!btn) return false;

    try {
      btn.scrollIntoView({ block: "center", inline: "center" });
      btn.focus?.();
    } catch {}

    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // If something overlays it, log it (helps debug)
    const topEl = document.elementFromPoint(x, y);
    if (topEl && topEl !== btn && !btn.contains(topEl)) {
      console.warn("[auto-autofix] elementFromPoint != button:", topEl);
    }

    const pe = (type) =>
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: type === "pointerdown" ? 1 : 0,
      });

    const me = (type) =>
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: type === "mousedown" ? 1 : 0,
      });

    try {
      btn.dispatchEvent(pe("pointerover"));
      btn.dispatchEvent(me("mouseover"));
      btn.dispatchEvent(pe("pointerdown"));
      btn.dispatchEvent(me("mousedown"));
      btn.dispatchEvent(pe("pointerup"));
      btn.dispatchEvent(me("mouseup"));
      btn.dispatchEvent(me("click"));
      return true;
    } catch (e) {
      console.warn("[auto-autofix] robustClick sequence failed:", e);
    }

    // fallbacks
    try {
      btn.click();
      return true;
    } catch {}
    try {
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, composed: true }));
      return true;
    } catch {}

    return false;
  };

  // ====== COUNTDOWN UI ======
  let badgeEl = null;
  const ensureBadge = () => {
    if (badgeEl) return badgeEl;
    badgeEl = document.createElement("div");
    badgeEl.style.position = "fixed";
    badgeEl.style.zIndex = "2147483647";
    badgeEl.style.padding = "6px 10px";
    badgeEl.style.borderRadius = "999px";
    badgeEl.style.font = "12px/1.2 -apple-system, system-ui, Segoe UI, Roboto, sans-serif";
    badgeEl.style.background = "rgba(0,0,0,.85)";
    badgeEl.style.color = "#fff";
    badgeEl.style.boxShadow = "0 8px 24px rgba(0,0,0,.25)";
    badgeEl.style.pointerEvents = "none";
    document.documentElement.appendChild(badgeEl);
    return badgeEl;
  };
  const removeBadge = () => {
    if (badgeEl && badgeEl.parentNode) badgeEl.parentNode.removeChild(badgeEl);
    badgeEl = null;
  };
  const positionBadgeNear = (btn) => {
    const b = ensureBadge();
    const r = btn.getBoundingClientRect();
    b.style.top = `${Math.max(8, r.top - 34)}px`;
    b.style.left = `${Math.min(window.innerWidth - 8, r.right) - 10}px`;
    b.style.transform = "translateX(-100%)";
  };

  // ====== STATE ======
  let armed = true;
  let countdownTimer = null;
  let restoreTimer = null;
  let pending = null; // { original, selStart, selEnd, restored, countdownLeft }

  const cutText = (countdownSec) => {
    const ta = findTextarea();
    if (!ta) {
      console.warn("[auto-autofix] textarea not found");
      return false;
    }

    const original = ta.value ?? "";
    if (ONLY_IF_TEXTAREA_HAS_TEXT && !original.trim()) return false;

    pending = {
      original,
      selStart: ta.selectionStart,
      selEnd: ta.selectionEnd,
      restored: false,
      countdownLeft: countdownSec,
    };

    ta.value = "";
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    ta.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  };

  const restoreText = () => {
    if (!pending || pending.restored) return;
    const ta = findTextarea();
    if (!ta) return;

    ta.value = pending.original;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    ta.dispatchEvent(new Event("change", { bubbles: true }));

    try {
      ta.focus();
      ta.setSelectionRange(
        pending.selStart ?? pending.original.length,
        pending.selEnd ?? pending.original.length
      );
    } catch {}

    pending.restored = true;
    console.log("[auto-autofix] text restored");
  };

  const cancelCountdown = (why = "") => {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = null;
    removeBadge();
    if (why) console.log("[auto-autofix] canceled:", why);
  };

  const startCountdown = () => {
    if (!isAutoFixEnabled()) return;
    const countdownSec = getAutoFixCountdownSec();
    const didCut = cutText(countdownSec);
    if (!didCut) {
      pending = { original: "", selStart: 0, selEnd: 0, restored: true, countdownLeft: countdownSec };
    }

    console.log(`[auto-autofix] Auto-fix detected. Clicking in ${countdownSec}s...`);

    const tick = () => {
      // IMPORTANT: re-find at click-time
      const btn = findAutoFixButton();
      if (!btn) {
        cancelCountdown("Auto-fix disappeared");
        if (pending && !pending.restored) restoreText();
        pending = null;
        return;
      }

      positionBadgeNear(btn);
      ensureBadge().textContent = `Auto-fix in ${pending.countdownLeft}s`;
      flash(btn);

      if (pending.countdownLeft <= 0) {
        cancelCountdown();

        console.log("[auto-autofix] clicking Auto-fix now");
        const ok = robustClick(btn);
        console.log("[auto-autofix] click dispatched:", ok);

        if (restoreTimer) clearTimeout(restoreTimer);
        restoreTimer = setTimeout(() => {
          restoreText();
          pending = null;
        }, RESTORE_DELAY_MS);

        return;
      }

      pending.countdownLeft -= 1;
    };

    tick();
    countdownTimer = setInterval(tick, 1000);

    armed = false;
    setTimeout(() => (armed = true), 1200);
  };

  // ====== OBSERVER ======
  const observer = new MutationObserver(() => {
    if (!isAutoFixEnabled()) {
      cancelCountdown("disabled");
      if (pending && !pending.restored) restoreText();
      pending = null;
      return;
    }
    if (!armed) return;
    if (pending && !pending.restored) return;

    const btn = findAutoFixButton();
    if (!btn) return;

    // Guard: prevent repeat on same card
    const key = btn.closest("ms-console-turn") || btn.closest(".error-container") || btn.parentElement || btn;
    if (key && key.dataset._autoAutofixSeen === "1") return;
    if (key) key.dataset._autoAutofixSeen = "1";

    startCountdown();
  });

  observer.observe(document.body, { childList: true, subtree: true, attributes: true });

  window.__autoAutofixStop = () => {
    observer.disconnect();
    cancelCountdown("stopped");
    if (restoreTimer) clearTimeout(restoreTimer);
    restoreTimer = null;
    if (pending && !pending.restored) restoreText();
    pending = null;
    console.log("[auto-autofix] stopped");
  };

  console.log(
    "[auto-autofix] watching for Auto-fix. When it appears: cut text → 3s countdown → click → restore. " +
      "Stop: window.__autoAutofixStop()"
  );
})();

// #prompt-bubble-automation
(() => {
  // ============================================================
  // PSB v2.7 — Execution Bar + ETA + Series Filter + Paste Lock
  //
  // Tabs: Build | Prompts | Run
  // Queue moved into always-visible Execution Bar.
  // Minimized panel now supports Maximize, shows ETA & Next.
  // ============================================================

  const APP_KEY = "aiStudioPromptBubble:v2.7";
  const CSS_ID = "psb-style";
  const ROOT_ID = "psb-root";
  const MINI_ID = "psb-mini";

  const HOTKEY_SEND_NEXT = { alt: true, key: "Enter" };
  const HOTKEY_TOGGLE = { alt: true, key: "\\" };

  // Page selectors (adjust if your target UI differs)
  const textareaSelector =
    'ms-code-assistant-chat textarea[placeholder*="Make changes"], textarea[placeholder*="Make changes"], ' +
    'ms-applet-generator-form textarea[placeholder*="Describe an app"], textarea[placeholder*="Describe an app"], ' +
    'ms-code-assistant-chat textarea, textarea.cdk-textarea-autosize';
  const sendBtnSelector =
    'ms-code-assistant-chat button.send-button.ms-button-primary, ' +
    'ms-applet-generator-form button.build-button.ms-button-primary, ' +
    'button.build-button.ms-button-primary';

  // Stability config
  const POST_COMPLETE_DELAY_MS = 6000; // "settle" delay after busy->ready
  const INTER_PROMPT_DELAY_DEFAULT_MS = 3000; // wait before loading/sending next prompt
  const RETRY_COUNTDOWN_SEC = 6;
  const RESTORE_DELAY_MS = 2600;

  const RETRY_TEXT_RE = /^\s*Retry\s*$/i;
  const RETRY_BTN_SCAN_SEL = "button";

  const getAutoSettings = () =>
    (window.__aiStudioAutomationGet && window.__aiStudioAutomationGet()) || {
      allowAccess: { enabled: true, countdownMs: 3000 },
      retry: { enabled: true, countdownSec: 3 },
      autoFix: { enabled: true, countdownSec: 3 },
      promptChain: { interPromptDelayMs: INTER_PROMPT_DELAY_DEFAULT_MS }
    };

  const saveAutoSettings = (patch) =>
    (window.__aiStudioAutomationSave && window.__aiStudioAutomationSave(patch)) || getAutoSettings();

  const computeMaxBtnCountdownMs = (auto) =>
    Math.max(
      auto?.allowAccess?.countdownMs ?? 0,
      (auto?.retry?.countdownSec ?? 0) * 1000,
      (auto?.autoFix?.countdownSec ?? 0) * 1000
    );

  // ============================================================
  // Utils / Storage
  // ============================================================
  const nowISO = () => new Date().toISOString();
  const uid = () => Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);

  const loadState = () => {
    try {
      const raw = localStorage.getItem(APP_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };
  const saveState = (s) => localStorage.setItem(APP_KEY, JSON.stringify(s));

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const humanMs = (ms) => {
    if (ms == null || !isFinite(ms)) return "—";
    ms = Math.max(0, ms);
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m < 60) return `${m}m ${r}s`;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}h ${mm}m`;
  };

  const toast = (msg) => {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = `
      position: fixed; right: 18px; bottom: 92px; z-index: 2147483647;
      background: rgba(30,30,30,.92); color: #fff; padding: 10px 12px;
      border-radius: 12px; font: 12px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial;
      box-shadow: 0 10px 30px rgba(0,0,0,.35);
      max-width: 520px;
      pointer-events: none;
    `;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  };

  const overlayHost = () => document.documentElement || document.body;

  const pinRoot = (root) => {
    if (!root) return root;
    root.removeAttribute("hidden");
    Object.assign(root.style, {
      position: "fixed",
      right: "18px",
      bottom: "18px",
      zIndex: "2147483647",
      display: "block",
      visibility: "visible",
      opacity: "1",
      pointerEvents: "auto"
    });
    return root;
  };

  const normalizeText = (raw) =>
    (raw || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  const hashText = (txt) => {
    // lightweight non-crypto hash (fast & stable enough for provenance)
    const s = String(txt || "");
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  };

  const findTextarea = () =>
    Array.from(document.querySelectorAll(textareaSelector)).find(isVisible) ||
    document.querySelector(textareaSelector);
  const findSendBtn = () =>
    Array.from(document.querySelectorAll(sendBtnSelector)).find(
      (btn) => isVisible(btn) && !btn.classList?.contains("button-hidden")
    ) || null;

  const setTextareaValue = (ta, value) => {
    if (!ta) return;
    ta.value = value;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    ta.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const isVisible = (el) =>
    !!el &&
    el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== "hidden" &&
    getComputedStyle(el).display !== "none" &&
    getComputedStyle(el).opacity !== "0";

  const getSendBtnState = () => {
    const btn = findSendBtn();
    if (!btn) return "missing";
    if (btn.classList?.contains("running")) return "running";
    const aria = btn.getAttribute("aria-disabled");
    if (aria === "true") return "disabled";
    if (btn.disabled) return "disabled";
    if (btn.classList?.contains("disabled")) return "disabled";
    return "ready";
  };

  const isModelBusy = () => getSendBtnState() === "running";
  const isSendClickable = () => getSendBtnState() === "ready";

  const clickSend = () => {
    const btn = findSendBtn();
    if (!btn) return false;
    if (!isSendClickable()) return false;
    btn.click();
    return true;
  };

  const waitFor = (pred, timeoutMs = 12000, stepMs = 120) =>
    new Promise((resolve) => {
      const t0 = Date.now();
      const tick = () => {
        try {
          if (pred()) return resolve(true);
        } catch {}
        if (Date.now() - t0 >= timeoutMs) return resolve(false);
        setTimeout(tick, stepMs);
      };
      tick();
    });

  function findRetryButton() {
    const btns = Array.from(document.querySelectorAll(RETRY_BTN_SCAN_SEL));
    return (
      btns.find((b) => {
        const t = (b.textContent || "").trim();
        return (
          RETRY_TEXT_RE.test(t) &&
          isVisible(b) &&
          !b.disabled &&
          b.getAttribute("aria-disabled") !== "true"
        );
      }) || null
    );
  }

  async function clickRetryWithCutRestore() {
    const rb = findRetryButton();
    if (!rb) return false;

    const ta = findTextarea();
    const snapshot = ta ? ta.value : "";

    if (ta) setTextareaValue(ta, "");
    rb.click();

    setTimeout(() => {
      const ta2 = findTextarea();
      if (ta2) setTextareaValue(ta2, snapshot);
    }, RESTORE_DELAY_MS);

    return true;
  }

  const getInterPromptDelayMs = () => {
    const auto = getAutoSettings();
    const raw = auto?.promptChain?.interPromptDelayMs ?? INTER_PROMPT_DELAY_DEFAULT_MS;
    const v = Number(raw);
    const base = isFinite(v) ? clamp(Math.round(v), 0, 300000) : INTER_PROMPT_DELAY_DEFAULT_MS;
    const min = computeMaxBtnCountdownMs(auto);
    return Math.max(base, min);
  };

  // ============================================================
  // Data model
  // ============================================================
  const defaultRun = () => ({
    running: false,
    waiting: false,
    phase: "idle",
    nextPromptId: null,

    autoRun: true,
    autoLoadOnly: false,

    lastStatus: "idle",
    lastError: null,

    startedAt: null, // series run start time (for timelapse)
    lastSentAt: null,
    lastSentPromptId: null,
    lastBusySeenAt: null,

    pendingPromptId: null,
    pendingStartedAt: null,
    postCompleteTimerId: null,
    interPromptTimerId: null,
    retryInProgress: false
  });

  const defaultPaste = () => ({
    raw: "",
    preview: [],
    autoSplitOnPaste: true,
    insertMode: "replace", // replace|append

    // provenance lock
    lockEnabled: true, // UI toggle; default ON
    locked: false, // becomes true after Insert if lockEnabled
    lockedAt: null,
    sourceRaw: null,
    sourceHash: null,

    lastEditedAt: null
  });

  const defaultStats = () => ({
    durationsMs: [], // last N completed prompt durations
    emaMs: null
  });

  const defaultSettings = () => ({
    // naming template
    naming: {
      template: "{type} {date} {time} — {preview:44}",
      defaultType: "Captured"
    },
    eta: {
      maxHistory: 50,
      emaAlpha: 0.30, // responsiveness
      minSamples: 3
    },
    ui: {
      showEtaRange: true,
      showDebug: false
    },
    timing: {
      interPromptDelayMs: INTER_PROMPT_DELAY_DEFAULT_MS
    }
  });

  const defaultState = () => ({
    series: [],
    activeSeriesId: null,
    global: {
      runningSeriesId: null,
      execOrder: [],
      chainEnabled: false
    },
    ui: {
      modalOpen: false,
      minimized: false,
      maximized: false,
      tab: "run",
      seriesFilter: ""
    },
    settings: defaultSettings()
  });

  let state = loadState() || defaultState();
  window.__psbState = state;

  // ============================================================
  // Hard stop old instance
  // ============================================================
  function hardStopExisting() {
    try {
      if (typeof window.__psbStop === "function") window.__psbStop(true);
    } catch {}
    try {
      if (window.__psbCopyHandler) document.removeEventListener("copy", window.__psbCopyHandler, true);
      if (window.__psbKeyHandler) window.removeEventListener("keydown", window.__psbKeyHandler, true);
    } catch {}
    document
      .querySelectorAll(`#${ROOT_ID}, #${MINI_ID}, #${CSS_ID}, .psb-modal, .psb-modal-backdrop`)
      .forEach((n) => n.remove());
  }
  if (document.getElementById(ROOT_ID) || document.getElementById(MINI_ID)) hardStopExisting();

  // ============================================================
  // Split logic (same idea; robust to code fences)
  // ============================================================
  function splitByDelimiterLinesOutsideFences(text) {
    const lines = text.split("\n");
    const parts = [];
    let buf = [];
    const isDelim = (ln) => /^\s*(?:-{3,}|⸻+|—{3,}|_{3,}|\*{3,})\s*$/.test(ln);
    let inFence = false;
    let fenceToken = null;

    for (const ln of lines) {
      const fenceMatch = ln.match(/^\s*(```+|~~~+)\s*/);
      if (fenceMatch) {
        const tok = fenceMatch[1].slice(0, 3);
        if (!inFence) {
          inFence = true;
          fenceToken = tok;
        } else if (tok === fenceToken) {
          inFence = false;
          fenceToken = null;
        }
      }

      if (!inFence && isDelim(ln)) {
        const chunk = buf.join("\n").trim();
        if (chunk) parts.push(chunk);
        buf = [];
        continue;
      }
      buf.push(ln);
    }
    const tail = buf.join("\n").trim();
    if (tail) parts.push(tail);

    return parts.length >= 2 ? parts : null;
  }

  function splitByPromptHeadersOutsideFences(text) {
    const lines = text.split("\n");
    const idxs = [];
    let inFence = false,
      fenceToken = null;
    const isHeader = (ln) => /^\s*(?:#{1,6}\s*)?Prompt\s+\d+\b[:.\-)]?\s*/i.test(ln);

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const fenceMatch = ln.match(/^\s*(```+|~~~+)\s*/);
      if (fenceMatch) {
        const tok = fenceMatch[1].slice(0, 3);
        if (!inFence) {
          inFence = true;
          fenceToken = tok;
        } else if (tok === fenceToken) {
          inFence = false;
          fenceToken = null;
        }
      }
      if (!inFence && isHeader(ln)) idxs.push(i);
    }

    if (idxs.length < 2) return null;

    const parts = [];
    for (let k = 0; k < idxs.length; k++) {
      const a = idxs[k];
      const b = k + 1 < idxs.length ? idxs[k + 1] : lines.length;
      const chunk = lines.slice(a, b).join("\n").trim();
      if (chunk) parts.push(chunk);
    }
    return parts.length >= 2 ? parts : null;
  }

  function extractTextFencesWithHeadings(text) {
    const lines = text.split("\n");
    const blocks = [];
    let currentHeading = "";
    let inFence = false;
    let fenceToken = null;
    let fenceInfo = "";
    let fenceHeading = "";
    let buf = [];

    for (const ln of lines) {
      const headingMatch = !inFence && ln.match(/^\s*#{1,6}\s+(.+?)\s*$/);
      if (headingMatch) currentHeading = headingMatch[1].trim();

      const fenceMatch = ln.match(/^\s*(```+|~~~+)\s*([^`]*)$/);
      if (fenceMatch) {
        const tok = fenceMatch[1].slice(0, 3);
        if (!inFence) {
          inFence = true;
          fenceToken = tok;
          fenceInfo = (fenceMatch[2] || "").trim().toLowerCase();
          fenceHeading = currentHeading;
          buf = [];
          continue;
        }
        if (tok === fenceToken) {
          const content = buf.join("\n").trim();
          if (content && (!fenceInfo || fenceInfo === "text" || fenceInfo.startsWith("text "))) {
            blocks.push({ heading: fenceHeading, content });
          }
          inFence = false;
          fenceToken = null;
          fenceInfo = "";
          fenceHeading = "";
          buf = [];
          continue;
        }
      }

      if (inFence) buf.push(ln);
    }

    return blocks;
  }

  function splitByPromptPackFences(text) {
    const blocks = extractTextFencesWithHeadings(text);
    if (blocks.length < 2) return null;

    const global = blocks.find((b) => /(?:global\s+prompt\s+header|universal\s+prefix)/i.test(b.heading || ""));
    const stages = blocks.filter((b) => /^stage\s+\d+\b/i.test(b.heading || ""));
    if (stages.length >= 2) {
      return stages.map((stage) => {
        const body = [`## ${stage.heading}`, stage.content].filter(Boolean).join("\n\n");
        return global ? [global.content, body].join("\n\n") : body;
      });
    }

    const idPrompts = blocks.filter((b) => /^(?:P\d{3,4}|R\d{3})\s+-\s+/i.test(b.heading || ""));
    if (idPrompts.length >= 2) {
      return idPrompts.map((prompt) => {
        const heading = prompt.heading || "";
        const body = [`## ${heading}`, prompt.content].join("\n\n");
        const permanentDocPrompt = /^P00\d\s+-\s+/i.test(heading);
        return global && !permanentDocPrompt ? [global.content, body].join("\n\n") : body;
      });
    }

    return blocks.map((b) =>
      b.heading ? [`## ${b.heading}`, b.content].join("\n\n") : b.content
    );
  }

  function splitByNumberedBlocksOutsideFences(text) {
    const lines = text.split("\n");
    const idxs = [];
    let inFence = false,
      fenceToken = null;
    const isNum = (ln) => /^\s*\d+[\)\.]\s+/.test(ln);

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const fenceMatch = ln.match(/^\s*(```+|~~~+)\s*/);
      if (fenceMatch) {
        const tok = fenceMatch[1].slice(0, 3);
        if (!inFence) {
          inFence = true;
          fenceToken = tok;
        } else if (tok === fenceToken) {
          inFence = false;
          fenceToken = null;
        }
      }
      if (!inFence && isNum(ln)) idxs.push(i);
    }

    if (idxs.length < 2) return null;

    const parts = [];
    for (let k = 0; k < idxs.length; k++) {
      const a = idxs[k];
      const b = k + 1 < idxs.length ? idxs[k + 1] : lines.length;
      const chunk = lines.slice(a, b).join("\n").trim();
      if (chunk) parts.push(chunk);
    }
    const likelyOnlyIndex = parts.filter((p) => p.split("\n").length <= 2 && p.length < 80).length;
    if (parts.length >= 2 && likelyOnlyIndex / parts.length > 0.7) return null;
    return parts.length >= 2 ? parts : null;
  }

  function splitByDoubleBlankOutsideFences(text) {
    const lines = text.split("\n");
    const parts = [];
    let buf = [];
    let blankStreak = 0;

    let inFence = false,
      fenceToken = null;

    const flush = () => {
      const chunk = buf.join("\n").trim();
      if (chunk) parts.push(chunk);
      buf = [];
      blankStreak = 0;
    };

    for (const ln of lines) {
      const fenceMatch = ln.match(/^\s*(```+|~~~+)\s*/);
      if (fenceMatch) {
        const tok = fenceMatch[1].slice(0, 3);
        if (!inFence) {
          inFence = true;
          fenceToken = tok;
        } else if (tok === fenceToken) {
          inFence = false;
          fenceToken = null;
        }
      }

      if (!inFence && ln.trim() === "") {
        blankStreak++;
        buf.push(ln);
        if (blankStreak >= 2) flush();
      } else {
        blankStreak = 0;
        buf.push(ln);
      }
    }

    const tail = buf.join("\n").trim();
    if (tail) parts.push(tail);
    return parts.length >= 2 ? parts : null;
  }

  function splitIntoPrompts(raw) {
    const text = normalizeText(raw);
    if (!text) return [];

    const byPromptPack = splitByPromptPackFences(text);
    if (byPromptPack) return byPromptPack;

    const byDelim = splitByDelimiterLinesOutsideFences(text);
    if (byDelim) return byDelim;

    const byHdr = splitByPromptHeadersOutsideFences(text);
    if (byHdr) return byHdr;

    const byNum = splitByNumberedBlocksOutsideFences(text);
    if (byNum) return byNum;

    const byDouble = splitByDoubleBlankOutsideFences(text);
    if (byDouble) return byDouble;

    return [text];
  }

  // ============================================================
  // Series helpers + migration
  // ============================================================
  function ensureExecOrderIntegrity() {
    if (!state.global) state.global = { runningSeriesId: null, execOrder: [], chainEnabled: false };
    if (!Array.isArray(state.global.execOrder)) state.global.execOrder = [];
    if (typeof state.global.chainEnabled !== "boolean") state.global.chainEnabled = false;

    const existing = new Set((state.series || []).map((s) => s.id));
    state.global.execOrder = state.global.execOrder.filter((id) => existing.has(id));
  }

  function getSeriesById(id) {
    return (state.series || []).find((s) => s.id === id) || null;
  }

  function getActiveSeries() {
    return getSeriesById(state.activeSeriesId) || null;
  }

  function ensureSeriesRun(series) {
    if (!series.run) series.run = defaultRun();
    for (const [k, v] of Object.entries(defaultRun())) {
      if (!(k in series.run)) series.run[k] = v;
    }
    return series.run;
  }

  function ensureSeriesPaste(series) {
    if (!series.paste) series.paste = defaultPaste();
    for (const [k, v] of Object.entries(defaultPaste())) {
      if (!(k in series.paste)) series.paste[k] = v;
    }
    if (!Array.isArray(series.paste.preview)) series.paste.preview = [];
    return series.paste;
  }

  function ensureSeriesStats(series) {
    if (!series.stats) series.stats = defaultStats();
    for (const [k, v] of Object.entries(defaultStats())) {
      if (!(k in series.stats)) series.stats[k] = v;
    }
    if (!Array.isArray(series.stats.durationsMs)) series.stats.durationsMs = [];
    return series.stats;
  }

  function migrateIfNeeded() {
    // Ensure settings exist
    if (!state.settings) state.settings = defaultSettings();
    for (const [k, v] of Object.entries(defaultSettings())) {
      if (!(k in state.settings)) state.settings[k] = v;
    }
    if (!state.settings.naming) state.settings.naming = defaultSettings().naming;
    if (!state.settings.eta) state.settings.eta = defaultSettings().eta;
    if (!state.settings.ui) state.settings.ui = defaultSettings().ui;
    if (!state.settings.timing) state.settings.timing = defaultSettings().timing;
    if (!("interPromptDelayMs" in state.settings.timing)) {
      state.settings.timing.interPromptDelayMs = INTER_PROMPT_DELAY_DEFAULT_MS;
    }

    // Ensure series
    if (!Array.isArray(state.series)) state.series = [];
    state.series.forEach((s) => {
      ensureSeriesRun(s);
      ensureSeriesPaste(s);
      ensureSeriesStats(s);

      // If older prompts lacked duration fields, keep as-is
      (s.prompts || []).forEach((p) => {
        if (!("durationMs" in p)) p.durationMs = null;
        if (!("completedAt" in p)) p.completedAt = null;
      });
    });

    ensureExecOrderIntegrity();
  }

  function computePreview(text, max = 60) {
    const t = (text || "").replace(/\s+/g, " ").trim();
    return t.length > max ? t.slice(0, max) + "…" : t;
  }

  function formatDateParts(d = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
  }

  function applyNameTemplate({ type, preview }) {
    const tpl = state.settings?.naming?.template || "{type} {date} {time} — {preview:44}";
    const { date, time } = formatDateParts(new Date());
    return tpl.replace(/\{([^}]+)\}/g, (_, expr) => {
      // expr can be "preview:44"
      const [key, arg] = expr.split(":").map((x) => String(x).trim());
      if (key === "type") return type || "";
      if (key === "date") return date;
      if (key === "time") return time;
      if (key === "preview") {
        const n = arg ? parseInt(arg, 10) : 44;
        return computePreview(preview, isFinite(n) ? n : 44);
      }
      return "";
    });
  }

  function addToExecOrder(seriesId, preferEnd = true) {
    ensureExecOrderIntegrity();
    if (state.global.execOrder.includes(seriesId)) return;
    preferEnd ? state.global.execOrder.push(seriesId) : state.global.execOrder.unshift(seriesId);
  }

  function moveExecOrder(seriesId, dir) {
    ensureExecOrderIntegrity();
    const arr = state.global.execOrder;
    const i = arr.indexOf(seriesId);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  function removeFromExecOrder(seriesId) {
    ensureExecOrderIntegrity();
    state.global.execOrder = state.global.execOrder.filter((x) => x !== seriesId);
  }

  function ensureActiveSeries() {
    ensureExecOrderIntegrity();
    let s = getActiveSeries();
    if (s) {
      ensureSeriesRun(s);
      ensureSeriesPaste(s);
      ensureSeriesStats(s);
      addToExecOrder(s.id, true);
      saveState(state);
      window.__psbState = state;
      return s;
    }
    const seriesId = uid();
    s = {
      id: seriesId,
      title: applyNameTemplate({ type: "Series", preview: "" }),
      createdAt: nowISO(),
      updatedAt: nowISO(),
      prompts: [],
      run: defaultRun(),
      paste: defaultPaste(),
      stats: defaultStats()
    };
    state.series.unshift(s);
    state.activeSeriesId = seriesId;
    addToExecOrder(seriesId, false);
    saveState(state);
    window.__psbState = state;
    return s;
  }

  function lockToSeries(series) {
    state.global.runningSeriesId = series.id;
    saveState(state);
    window.__psbState = state;
  }

  function unlockSeries(series) {
    if (state.global.runningSeriesId === series.id) {
      state.global.runningSeriesId = null;
      saveState(state);
      window.__psbState = state;
    }
  }

  function getLockedSeries() {
    const id = state.global.runningSeriesId;
    if (!id) return null;
    return getSeriesById(id);
  }

  // ============================================================
  // Prompts helpers
  // ============================================================
  function listPromptIds(series) {
    return (series.prompts || []).map((p) => p.id);
  }

  function findPrompt(series, promptId) {
    return (series.prompts || []).find((p) => p.id === promptId) || null;
  }

  function firstUnsentPromptId(series) {
    const p = (series.prompts || []).find((x) => !x.sentAt && (x.text || "").trim());
    return p ? p.id : null;
  }

  function computeNextPromptId(series) {
    const run = ensureSeriesRun(series);
    const ids = new Set(listPromptIds(series));
    if (run.nextPromptId && ids.has(run.nextPromptId)) {
      const p = findPrompt(series, run.nextPromptId);
      if (p && !p.sentAt && (p.text || "").trim()) return run.nextPromptId;
    }
    return firstUnsentPromptId(series);
  }

  function syncNextPointer(series, persist = false) {
    const run = ensureSeriesRun(series);
    const next = computeNextPromptId(series);
    if (run.nextPromptId !== next) {
      run.nextPromptId = next;
      if (persist) {
        series.updatedAt = nowISO();
        saveState(state);
        window.__psbState = state;
      }
    }
    return run.nextPromptId;
  }

  function advanceNextPromptId(series, justSentId) {
    const run = ensureSeriesRun(series);
    const ids = listPromptIds(series);
    const idx = ids.indexOf(justSentId);
    for (let i = Math.max(idx + 1, 0); i < ids.length; i++) {
      const p = findPrompt(series, ids[i]);
      if (p && !p.sentAt && (p.text || "").trim()) {
        run.nextPromptId = p.id;
        return run.nextPromptId;
      }
    }
    run.nextPromptId = firstUnsentPromptId(series);
    return run.nextPromptId;
  }

  function clearPostCompleteTimer(run) {
    if (run.postCompleteTimerId) {
      try {
        clearTimeout(run.postCompleteTimerId);
      } catch {}
      run.postCompleteTimerId = null;
    }
  }

  function clearInterPromptTimer(run) {
    if (run.interPromptTimerId) {
      try {
        clearTimeout(run.interPromptTimerId);
      } catch {}
      run.interPromptTimerId = null;
    }
  }

  // ============================================================
  // ETA / Stats
  // ============================================================
  function pushDuration(series, ms) {
    ms = Math.max(0, ms | 0);
    const st = ensureSeriesStats(series);
    const maxH = clamp(state.settings?.eta?.maxHistory ?? 50, 10, 300);
    st.durationsMs.push(ms);
    while (st.durationsMs.length > maxH) st.durationsMs.shift();

    // EMA update
    const a = clamp(state.settings?.eta?.emaAlpha ?? 0.3, 0.05, 0.8);
    if (st.emaMs == null) st.emaMs = ms;
    else st.emaMs = a * ms + (1 - a) * st.emaMs;

    series.updatedAt = nowISO();
  }

  function median(arr) {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
  }

  function trimmedMean(arr, trim = 0.15) {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const k = Math.floor(s.length * trim);
    const core = s.slice(k, s.length - k);
    const use = core.length ? core : s;
    const sum = use.reduce((a, b) => a + b, 0);
    return Math.round(sum / use.length);
  }

  function mean(arr) {
    if (!arr.length) return null;
    const sum = arr.reduce((a, b) => a + b, 0);
    return Math.round(sum / arr.length);
  }

  function getRemainingCount(series) {
    return (series.prompts || []).filter((p) => !p.sentAt && (p.text || "").trim()).length;
  }

  function computeEtaForSeries(series) {
    const st = ensureSeriesStats(series);
    const samples = st.durationsMs || [];
    const minS = state.settings?.eta?.minSamples ?? 3;

    const mMean = samples.length ? mean(samples) : null;
    const mMed = samples.length ? median(samples) : null;
    const mTrim = samples.length ? trimmedMean(samples, 0.15) : null;
    const mEma = st.emaMs != null ? Math.round(st.emaMs) : null;

    // choose primary:
    // - if enough samples: prefer EMA for responsiveness, but show robust range (median/trim)
    // - if few samples: use mean but mark low confidence
    let primary = null;
    let method = "—";
    let confidence = "low";

    if (samples.length >= minS && mEma != null) {
      primary = mEma;
      method = "EMA";
      confidence = samples.length >= 10 ? "high" : "med";
    } else if (samples.length >= 2 && mMed != null) {
      primary = mMed;
      method = "Median";
      confidence = "low";
    } else if (samples.length >= 1 && mMean != null) {
      primary = mMean;
      method = "Mean";
      confidence = "low";
    }

    const rem = getRemainingCount(series);
    const etaMs = primary != null ? rem * primary : null;

    // range estimate if enough data
    let lo = null,
      hi = null;
    if (samples.length >= minS && (mMed != null || mTrim != null)) {
      const a = mTrim ?? mMed;
      const b = mMed ?? mTrim;
      lo = Math.min(a, b);
      hi = Math.max(a, b);
    }

    return {
      perPromptMs: primary,
      method,
      confidence,
      remaining: rem,
      etaMs,
      rangeLoMs: lo != null ? rem * lo : null,
      rangeHiMs: hi != null ? rem * hi : null
    };
  }

  function computeElapsedSeriesMs(series) {
    const arr = (series.prompts || [])
      .map((p) => p.durationMs)
      .filter((x) => x != null && isFinite(x));
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0);
  }

  function computeTotalEtaAcrossExecOrder() {
    ensureExecOrderIntegrity();
    let sum = 0;
    let hasAny = false;

    for (const id of state.global.execOrder) {
      const s = getSeriesById(id);
      if (!s) continue;
      const e = computeEtaForSeries(s);
      if (e.etaMs != null) {
        sum += e.etaMs;
        hasAny = true;
      } else {
        // if no ETA for a series, skip (we won't fake precision)
      }
    }
    return hasAny ? sum : null;
  }

  // ============================================================
  // Commit pipeline with duration capture
  // ============================================================
  function commitPendingAndAdvance(series) {
    const run = ensureSeriesRun(series);
    const pid = run.pendingPromptId;
    if (!pid) return false;

    const p = findPrompt(series, pid);
    const completedAt = nowISO();

    // mark sent (kept for backwards compat)
    if (p) {
      if (!p.sentAt) p.sentAt = completedAt;
      p.completedAt = completedAt;

      if (run.pendingStartedAt) {
        const dur = Date.now() - new Date(run.pendingStartedAt).getTime();
        p.durationMs = Math.max(0, dur);
        pushDuration(series, p.durationMs);
      }
    }

    advanceNextPromptId(series, pid);
    syncNextPointer(series, false);

    run.lastSentAt = completedAt;
    run.lastSentPromptId = pid;

    run.pendingPromptId = null;
    run.pendingStartedAt = null;

    series.updatedAt = nowISO();
    saveState(state);
    window.__psbState = state;
    return true;
  }

  async function retryCountdownThenClick(series) {
    const run = ensureSeriesRun(series);
    run.retryInProgress = true;
    run.phase = "retry_countdown";
    run.lastStatus = "waiting";
    series.updatedAt = nowISO();
    saveState(state);
    window.__psbState = state;
    renderIfOpen();

    for (let s = RETRY_COUNTDOWN_SEC; s >= 1; s--) {
      toast(`Retry in ${s}s… (holding same prompt)`);
      if (!findRetryButton()) break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (findRetryButton()) {
      await clickRetryWithCutRestore();
      toast("Retry clicked. Waiting…");
    }

    run.retryInProgress = false;
    run.phase = "await_busy";
    run.lastStatus = "waiting";
    series.updatedAt = nowISO();
    saveState(state);
    window.__psbState = state;
    renderIfOpen();
  }

  function beginPostCompleteDelay(series) {
    const run = ensureSeriesRun(series);
    clearPostCompleteTimer(run);

    run.phase = "post_complete_delay";
    run.lastStatus = "waiting";
    series.updatedAt = nowISO();
    saveState(state);
    window.__psbState = state;
    renderIfOpen();

    run.postCompleteTimerId = setTimeout(async () => {
      const s2 = getLockedSeries() || series;
      if (!s2) return;
      const r2 = ensureSeriesRun(s2);

      if (!r2.running || !r2.waiting) return;

      if (isModelBusy()) {
        r2.phase = "busy";
        r2.lastStatus = "waiting";
        saveState(state);
        window.__psbState = state;
        renderIfOpen();
        return;
      }

      if (findRetryButton()) {
        clearPostCompleteTimer(r2);
        await retryCountdownThenClick(s2);
        return;
      }

      r2.waiting = false;
      r2.phase = "ready";
      r2.lastStatus = "ready";

      commitPendingAndAdvance(s2);

      saveState(state);
      window.__psbState = state;
      renderIfOpen();

      if (r2.autoRun) {
        const delayMs = getInterPromptDelayMs();
        if (delayMs > 0) {
          clearInterPromptTimer(r2);
          r2.phase = "inter_prompt_delay";
          r2.lastStatus = "waiting";
          saveState(state);
          window.__psbState = state;
          renderIfOpen();

          r2.interPromptTimerId = setTimeout(() => {
            const s3 = getLockedSeries() || s2;
            if (!s3) return;
            const r3 = ensureSeriesRun(s3);
            if (!r3.running || r3.waiting) return;

            if (findRetryButton()) {
              r3.running = false;
              r3.waiting = false;
              r3.phase = "paused";
              r3.lastStatus = "paused";
              r3.lastError = "Retry detected before auto-send";
              unlockSeries(s3);
              saveState(state);
              window.__psbState = state;
              toast("Retry detected. Auto-run paused; resolve retry then resume.");
              renderIfOpen();
              return;
            }

            if (isModelBusy()) return;
            sendNext(true);
          }, delayMs);
        } else {
          setTimeout(() => sendNext(true), 0);
        }
      }
    }, POST_COMPLETE_DELAY_MS);
  }

  async function maybeHandleRetry(series) {
    const run = ensureSeriesRun(series);
    if (!run.running || !run.waiting) return;
    if (!run.pendingPromptId) return;
    if (run.retryInProgress) return;
    if (!findRetryButton()) return;

    clearPostCompleteTimer(run);
    await retryCountdownThenClick(series);
  }

  // ============================================================
  // Runner
  // ============================================================
  let sendBtnObserver = null;
  let sendBtnPoller = null;
  let observedBtn = null;

  function detachObservers() {
    try {
      sendBtnObserver && sendBtnObserver.disconnect();
    } catch {}
    sendBtnObserver = null;
    observedBtn = null;
    try {
      sendBtnPoller && clearInterval(sendBtnPoller);
    } catch {}
    sendBtnPoller = null;
  }

  function attachObservers() {
    if (sendBtnObserver) return;

    sendBtnObserver = new MutationObserver(() => {
      const series = getLockedSeries();
      if (!series) return;

      const run = ensureSeriesRun(series);
      if (!run.running || !run.waiting) return;

      maybeHandleRetry(series);

      const busy = isModelBusy();

      if (run.phase === "post_complete_delay" && busy) {
        clearPostCompleteTimer(run);
        run.phase = "busy";
        run.lastBusySeenAt = nowISO();
        saveState(state);
        window.__psbState = state;
        renderIfOpen();
        return;
      }

      if (run.phase === "await_busy") {
        if (busy) {
          run.phase = "busy";
          run.lastBusySeenAt = nowISO();
          saveState(state);
          window.__psbState = state;
          renderIfOpen();
        }
      } else if (run.phase === "busy" || run.phase === "waiting") {
        if (!busy) {
          beginPostCompleteDelay(series);
        }
      }
    });

    const tryObserve = () => {
      const btn = findSendBtn();
      if (!btn) return false;

      if (observedBtn && observedBtn !== btn) {
        try {
          sendBtnObserver.disconnect();
        } catch {}
      }
      observedBtn = btn;

      try {
        sendBtnObserver.observe(btn, {
          attributes: true,
          attributeFilter: ["aria-disabled", "disabled", "class"]
        });
      } catch {}
      return true;
    };

    tryObserve();
    sendBtnPoller = setInterval(() => tryObserve(), 650);
  }

  function loadNextIntoTextarea(series, silent = false) {
    const nextId = syncNextPointer(series, false);

    if (!nextId) {
      if (!silent) toast("No next prompt (done / empty).");
      return false;
    }

    const p = findPrompt(series, nextId);
    const text = (p?.text || "").trim();
    if (!text) {
      if (!silent) toast("Next prompt is empty.");
      return false;
    }

    const ta = findTextarea();
    if (!ta) {
      toast("Textarea not found.");
      return false;
    }

    setTextareaValue(ta, text);
    if (!silent) toast("Loaded next prompt.");
    return true;
  }

  function getNextSeriesInExecOrder(currentId) {
    ensureExecOrderIntegrity();
    const order = state.global.execOrder;
    if (!order.length) return null;

    const startIdx = Math.max(order.indexOf(currentId), -1);
    const candidates = [];
    for (let i = startIdx + 1; i < order.length; i++) candidates.push(order[i]);
    for (let i = 0; i <= startIdx; i++) candidates.push(order[i]);

    for (const id of candidates) {
      const s = getSeriesById(id);
      if (!s) continue;
      ensureSeriesRun(s);
      const nxt = computeNextPromptId(s);
      if (nxt) return s;
    }
    return null;
  }

  async function sendNext(fromAuto = false) {
    const series = getLockedSeries() || ensureActiveSeries();
    const run = ensureSeriesRun(series);

    clearInterPromptTimer(run);

    if (!state.global.runningSeriesId) lockToSeries(series);

    if (!run.running) {
      if (!fromAuto) toast("Run is not active.");
      return;
    }

    if (run.waiting || isModelBusy()) {
      if (!fromAuto) toast("Busy: waiting for current task to finish…");
      return;
    }

    const nextId = syncNextPointer(series, false);
    if (!nextId) {
      run.running = false;
      run.waiting = false;
      clearPostCompleteTimer(run);
      clearInterPromptTimer(run);
      run.lastStatus = "done";
      run.phase = "done";
      unlockSeries(series);

      // chain
      if (state.global.chainEnabled) {
        const nxtSeries = getNextSeriesInExecOrder(series.id);
        if (nxtSeries && nxtSeries.id !== series.id) {
          state.activeSeriesId = nxtSeries.id;
          addToExecOrder(nxtSeries.id, true);
          saveState(state);
          window.__psbState = state;
          toast(`Chaining → ${nxtSeries.title}`);
          renderIfOpen();
          setTimeout(() => startRun(), 0);
          return;
        }
      }

      toast("Series complete.");
      renderIfOpen();
      return;
    }

    if (!loadNextIntoTextarea(series, true)) {
      run.running = false;
      run.waiting = false;
      clearPostCompleteTimer(run);
      clearInterPromptTimer(run);
      run.lastStatus = "error";
      run.lastError = "Failed to load next prompt";
      unlockSeries(series);
      renderIfOpen();
      return;
    }

    if (run.autoLoadOnly) {
      run.running = false;
      clearPostCompleteTimer(run);
      clearInterPromptTimer(run);
      run.lastStatus = "paused";
      run.phase = "paused";
      toast("Loaded next (load-only). Click Send Next to send.");
      renderIfOpen();
      return;
    }

    const okReady = await waitFor(() => isSendClickable(), 12000, 120);
    if (!okReady) {
      run.lastStatus = "error";
      run.lastError = "Send not clickable (timeout)";
      run.running = false;
      clearPostCompleteTimer(run);
      clearInterPromptTimer(run);
      unlockSeries(series);
      toast("Send not clickable yet (timeout).");
      renderIfOpen();
      return;
    }

    const ok = clickSend();
    if (!ok) {
      run.lastStatus = "error";
      run.lastError = "Send click failed";
      run.running = false;
      clearPostCompleteTimer(run);
      clearInterPromptTimer(run);
      unlockSeries(series);
      toast("Send click failed.");
      renderIfOpen();
      return;
    }

    run.pendingPromptId = nextId;
    run.pendingStartedAt = nowISO();
    series.updatedAt = nowISO();
    saveState(state);
    window.__psbState = state;

    run.waiting = true;
    run.phase = "await_busy";
    run.lastStatus = "waiting";
    series.updatedAt = nowISO();
    saveState(state);
    window.__psbState = state;

    attachObservers();

    setTimeout(() => {
      const s2 = getLockedSeries();
      if (!s2) return;
      const r2 = ensureSeriesRun(s2);
      if (!r2.running || !r2.waiting) return;
      if (r2.phase === "await_busy" && isModelBusy()) {
        r2.phase = "busy";
        r2.lastBusySeenAt = nowISO();
        saveState(state);
        window.__psbState = state;
        renderIfOpen();
      }
    }, 600);

    if (!fromAuto) toast("Sent. Waiting for completion…");
    renderIfOpen();
  }

  function startRun() {
    const series = ensureActiveSeries();
    const run = ensureSeriesRun(series);

    if (!(series.prompts || []).length) {
      toast("No prompts to run.");
      return;
    }

    lockToSeries(series);
    syncNextPointer(series, true);

    clearPostCompleteTimer(run);
    clearInterPromptTimer(run);
    run.pendingPromptId = null;
    run.pendingStartedAt = null;
    run.retryInProgress = false;

    run.running = true;
    run.waiting = false;
    run.phase = "ready";
    run.lastStatus = "running";
    run.lastError = null;

    if (!run.startedAt) run.startedAt = nowISO();

    series.updatedAt = nowISO();
    saveState(state);
    window.__psbState = state;

    attachObservers();

    if (isModelBusy()) {
      run.waiting = true;
      run.phase = "busy";
      run.lastStatus = "waiting";
      saveState(state);
      window.__psbState = state;
      toast("Run started (waiting for current completion)...");
      renderIfOpen();
      return;
    }

    sendNext(true);
    toast("Run started.");
    renderIfOpen();
  }

  function pauseRun() {
    const series = getLockedSeries() || getActiveSeries();
    if (!series) return;
    const run = ensureSeriesRun(series);

    run.running = false;
    run.waiting = false;
    clearPostCompleteTimer(run);
    clearInterPromptTimer(run);
    run.lastStatus = "paused";
    run.phase = "paused";
    unlockSeries(series);

    series.updatedAt = nowISO();
    saveState(state);
    window.__psbState = state;

    toast("Paused.");
    renderIfOpen();
  }

  function resumeRun() {
    const series = ensureActiveSeries();
    const run = ensureSeriesRun(series);

    lockToSeries(series);
    syncNextPointer(series, true);

    run.running = true;
    run.lastError = null;

    if (!run.startedAt) run.startedAt = nowISO();

    attachObservers();

    if (isModelBusy()) {
      run.waiting = true;
      run.phase = "busy";
      run.lastStatus = "waiting";
      saveState(state);
      window.__psbState = state;
      toast("Resumed. Waiting for completion…");
      renderIfOpen();
      return;
    }

    run.waiting = false;
    run.phase = "ready";
    run.lastStatus = "running";
    saveState(state);
    window.__psbState = state;

    sendNext(true);
    toast("Resumed.");
    renderIfOpen();
  }

  function clearRunStateForActiveSeries() {
    const series = getActiveSeries();
    if (!series) return;
    const run = ensureSeriesRun(series);
    clearPostCompleteTimer(run);
    clearInterPromptTimer(run);
    series.run = defaultRun();
    unlockSeries(series);
    series.updatedAt = nowISO();
    saveState(state);
    window.__psbState = state;
    toast("Run state cleared for this series.");
    renderIfOpen();
  }

  // ============================================================
  // Build: per-series paste + provenance lock (immutable after Insert)
  // ============================================================
  function recomputeSeriesPastePreview(series) {
    ensureSeriesPaste(series);
    series.paste.preview = splitIntoPrompts(series.paste.raw);
  }

  function insertSeriesPastePreviewIntoSeries(andRun = false) {
    const s = ensureActiveSeries();
    ensureSeriesRun(s);
    ensureSeriesPaste(s);

    if (s.paste.locked && s.paste.lockEnabled) {
      toast("Paste is locked. Unlock to modify, or use existing preview.");
      // still allow insert from locked paste (that's the point)
    }

    recomputeSeriesPastePreview(s);
    const parts = (s.paste.preview || []).map((x) => (x || "").trim()).filter(Boolean);
    if (!parts.length) return toast("Nothing to insert.");

    const prompts = parts.map((text) => ({
      id: uid(),
      text,
      sentAt: null,
      completedAt: null,
      durationMs: null
    }));

    if (s.paste.insertMode === "append") {
      s.prompts.push(...prompts);
    } else {
      s.prompts = prompts;
      // clear run lock to avoid cross-run confusion on replace
      s.run = defaultRun();
      unlockSeries(s);
    }

    // provenance immutability after insert:
    if (s.paste.lockEnabled) {
      s.paste.sourceRaw = normalizeText(s.paste.raw);
      s.paste.sourceHash = hashText(s.paste.sourceRaw);
      s.paste.locked = true;
      s.paste.lockedAt = nowISO();
    }

    s.updatedAt = nowISO();
    syncNextPointer(s, false);
    addToExecOrder(s.id, true);

    saveState(state);
    window.__psbState = state;

    toast(`Inserted ${prompts.length} prompt(s) into "${s.title}".`);
    state.ui.tab = "run";
    saveState(state);

    if (andRun) startRun();
    renderIfOpen();
  }

  // ============================================================
  // Copy capture: creates series with prompts + stores raw paste
  // ============================================================
  async function handleCopyCapture() {
    const selText = (window.getSelection && window.getSelection().toString()) || "";
    let clipText = "";
    try {
      if (navigator.clipboard && navigator.clipboard.readText) clipText = await navigator.clipboard.readText();
    } catch {}
    const raw = clipText && clipText.trim().length >= selText.trim().length ? clipText : selText;
    const cleaned = normalizeText(raw);
    const prompts = splitIntoPrompts(cleaned);
    if (!prompts.length) return;

    const seriesId = uid();
    const title = applyNameTemplate({
      type: state.settings?.naming?.defaultType || "Captured",
      preview: cleaned
    });

    const series = {
      id: seriesId,
      title,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      prompts: prompts.map((p) => ({
        id: uid(),
        text: p,
        sentAt: null,
        completedAt: null,
        durationMs: null
      })),
      run: defaultRun(),
      paste: defaultPaste(),
      stats: defaultStats()
    };

    series.paste.raw = cleaned;
    series.paste.preview = prompts.slice();
    series.paste.lastEditedAt = nowISO();

    // initial provenance is not locked yet; lock happens after Insert or manual lock
    series.paste.lockEnabled = true;
    series.paste.locked = false;

    state.series.unshift(series);
    state.activeSeriesId = seriesId;

    addToExecOrder(seriesId, false);

    syncNextPointer(series, false);
    saveState(state);
    window.__psbState = state;

    toast(`Captured ${series.prompts.length} prompt(s)`);
    renderIfOpen();
  }

  // ============================================================
  // Series delete (confirm)
  // ============================================================
  function deleteSeriesById(seriesId) {
    const s = getSeriesById(seriesId);
    if (!s) return;

    if (state.global.runningSeriesId === seriesId) {
      const run = ensureSeriesRun(s);
      clearPostCompleteTimer(run);
      clearInterPromptTimer(run);
      run.running = false;
      run.waiting = false;
      unlockSeries(s);
    }

    state.series = state.series.filter((x) => x.id !== seriesId);
    removeFromExecOrder(seriesId);

    if (state.activeSeriesId === seriesId) {
      state.activeSeriesId = state.series[0]?.id || null;
      if (!state.activeSeriesId) ensureActiveSeries();
    }

    saveState(state);
    window.__psbState = state;
    toast("Series deleted.");
    renderIfOpen();
  }

  function setActiveSeries(id) {
    const lockId = state.global.runningSeriesId;
    if (lockId && lockId !== id) {
      // Safety: do NOT silently switch while running.
      const runningS = getSeriesById(lockId);
      const rr = runningS ? ensureSeriesRun(runningS) : null;
      if (rr && (rr.running || rr.waiting)) {
        toast("Pause the current run before switching series (safety).");
        return;
      }
    }
    state.activeSeriesId = id;
    const s = ensureActiveSeries();
    ensureSeriesRun(s);
    ensureSeriesPaste(s);
    ensureSeriesStats(s);
    addToExecOrder(s.id, true);
    syncNextPointer(s, true);
    saveState(state);
    window.__psbState = state;
    renderIfOpen();
  }

  // ============================================================
  // Prompt operations: reorder, delete, merge->next
  // ============================================================
  function movePrompt(series, promptId, dir) {
    const idx = (series.prompts || []).findIndex((p) => p.id === promptId);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= series.prompts.length) return;

    const run = ensureSeriesRun(series);
    if (run.pendingPromptId && (run.pendingPromptId === promptId || run.pendingPromptId === series.prompts[j].id)) {
      toast("Can't reorder: one of these prompts is pending send.");
      return;
    }

    const tmp = series.prompts[idx];
    series.prompts[idx] = series.prompts[j];
    series.prompts[j] = tmp;

    series.updatedAt = nowISO();
    saveState(state);
    window.__psbState = state;
    renderIfOpen();
  }

  function deletePrompt(series, promptId) {
    const idx = (series.prompts || []).findIndex((p) => p.id === promptId);
    if (idx < 0) return;

    const run = ensureSeriesRun(series);
    if (run.pendingPromptId === promptId) {
      toast("Can't delete: prompt is pending send.");
      return;
    }

    series.prompts.splice(idx, 1);
    if (run.nextPromptId === promptId) run.nextPromptId = computeNextPromptId(series);

    series.updatedAt = nowISO();
    saveState(state);
    window.__psbState = state;
    renderIfOpen();
  }

  function mergePromptToNext(series, promptId) {
    const idx = (series.prompts || []).findIndex((p) => p.id === promptId);
    if (idx < 0 || idx >= series.prompts.length - 1) return;

    const cur = series.prompts[idx];
    const nxt = series.prompts[idx + 1];

    const run = ensureSeriesRun(series);
    if (run.pendingPromptId && (run.pendingPromptId === cur.id || run.pendingPromptId === nxt.id)) {
      toast("Can't merge: one of these prompts is pending send.");
      return;
    }

    const curText = (cur.text || "").trim();
    const nxtText = (nxt.text || "").trim();
    if (!curText && !nxtText) return;

    if (cur.sentAt || nxt.sentAt) {
      const ok = confirm(
        "One of these prompts is marked SENT.\n\nMerging will CLEAR sent/completed status for the merged prompt.\nContinue?"
      );
      if (!ok) return;
    }

    cur.text = [curText, nxtText].filter(Boolean).join("\n\n");
    cur.sentAt = null;
    cur.completedAt = null;
    cur.durationMs = null;

    series.prompts.splice(idx + 1, 1);

    if (run.nextPromptId === nxt.id) run.nextPromptId = cur.id;
    syncNextPointer(series, false);

    series.updatedAt = nowISO();
    saveState(state);
    window.__psbState = state;

    toast("Merged into next.");
    renderIfOpen();
  }

  // ============================================================
  // UI
  // ============================================================
  function ensureStyles() {
    if (document.getElementById(CSS_ID)) return;
    const style = document.createElement("style");
    style.id = CSS_ID;
    style.textContent = `
      #${ROOT_ID} { position: fixed; right: 18px; bottom: 18px; z-index: 2147483647; }
      .psb-bubble {
        width: 54px; height: 54px; border-radius: 16px;
        background: rgba(20,20,20,.92);
        color: #fff; display:flex; align-items:center; justify-content:center;
        box-shadow: 0 12px 32px rgba(0,0,0,.38);
        cursor:pointer; user-select:none;
        font: 14px/1 system-ui, -apple-system, Segoe UI, Roboto, Arial;
        border: 1px solid rgba(255,255,255,.10);
      }
      .psb-badge {
        position: absolute; top: -6px; right: -6px;
        min-width: 22px; height: 22px; padding: 0 6px;
        border-radius: 999px; background: #ffcc00; color: #111;
        display:flex; align-items:center; justify-content:center;
        font: 12px/1 system-ui; font-weight: 900;
        box-shadow: 0 8px 16px rgba(0,0,0,.25);
      }

      .psb-modal-backdrop {
        position: fixed; inset: 0; background: rgba(0,0,0,.45);
        z-index: 2147483646;
      }
      .psb-modal {
        position: fixed; right: 18px; bottom: 86px;
        width: min(1180px, calc(100vw - 36px));
        height: min(800px, calc(100vh - 140px));
        background: rgba(22,22,22,.97); color: #fff;
        border-radius: 18px; border: 1px solid rgba(255,255,255,.12);
        box-shadow: 0 20px 60px rgba(0,0,0,.55);
        z-index: 2147483647;
        overflow: hidden;
        display: grid;
        grid-template-columns: 360px 1fr;
      }
      .psb-modal.max {
        right: 12px; bottom: 12px;
        width: calc(100vw - 24px);
        height: calc(100vh - 24px);
        border-radius: 20px;
      }

      .psb-left { border-right: 1px solid rgba(255,255,255,.08); padding: 14px; overflow: auto; }
      .psb-right { padding: 14px; overflow: auto; }

      .psb-topbar { display:flex; align-items:center; gap:10px; margin-bottom: 10px; }
      .psb-topbar .title { flex: 1; font: 13px/1.2 system-ui; font-weight: 900; opacity: .95; }

      .psb-tabs { display:flex; gap:8px; margin: 10px 0 12px 0; }
      .psb-tab {
        flex: 1;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.08);
        padding: 8px 10px;
        font: 12px/1 system-ui; font-weight: 900;
        cursor: pointer;
        text-align:center;
        user-select:none;
      }
      .psb-tab.active { background: rgba(255,204,0,.95); border-color: rgba(255,204,0,.95); color: #111; }

      .psb-iconbtn {
        width: 34px; height: 34px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.10);
        color: #fff;
        cursor: pointer;
        display:flex; align-items:center; justify-content:center;
        font: 14px/1 system-ui;
        user-select:none;
      }
      .psb-iconbtn:hover { background: rgba(255,255,255,.14); }
      .psb-iconbtn.danger { border-color: rgba(255,120,120,.35); }
      .psb-iconbtn.danger:hover { background: rgba(255,120,120,.16); }
      .psb-iconbtn.tiny { width: 28px; height: 28px; border-radius: 10px; font-size: 12px; }

      .psb-h { font: 13px/1.2 system-ui; font-weight: 900; margin: 0 0 10px 0; opacity: .95; }
      .psb-small { font: 12px/1.3 system-ui; opacity: .78; }
      .psb-btn {
        background: rgba(255,255,255,.10);
        color: #fff; border: 1px solid rgba(255,255,255,.14);
        border-radius: 12px; padding: 8px 10px;
        font: 12px/1 system-ui; font-weight: 900;
        cursor: pointer; user-select:none;
      }
      .psb-btn:hover { background: rgba(255,255,255,.14); }
      .psb-btn.primary { background: #ffcc00; border-color: #ffcc00; color: #111; }
      .psb-btn.danger { border-color: rgba(255,120,120,.35); }
      .psb-row { display:flex; gap: 8px; align-items: center; margin: 10px 0; flex-wrap: wrap; }

      .psb-input, .psb-textarea, .psb-select {
        width: 100%;
        background: rgba(255,255,255,.08);
        color: #fff; border: 1px solid rgba(255,255,255,.14);
        border-radius: 12px; padding: 10px 10px;
        font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        outline: none;
      }
      .psb-textarea { min-height: 108px; resize: vertical; }

      .psb-series-item {
        padding: 10px; border-radius: 14px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        cursor: pointer;
        margin-bottom: 10px;
      }
      .psb-series-item:hover { background: rgba(255,255,255,.08); }
      .psb-series-item.active { outline: 2px solid rgba(255,204,0,.9); }
      .psb-series-title-row { display:flex; align-items:center; gap: 8px; }
      .psb-series-title { flex:1; font: 12px/1.2 system-ui; font-weight: 900; }
      .psb-series-meta { font: 11px/1.2 system-ui; opacity: .70; margin-top: 4px; }
      .psb-divider { height: 1px; background: rgba(255,255,255,.10); margin: 12px 0; }

      .psb-chip { display:inline-flex; gap:8px; align-items:center; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); padding: 8px 10px; border-radius: 12px; }
      .psb-chip input { margin: 0; }

      .psb-card {
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        border-radius: 14px;
        padding: 10px;
        margin: 10px 0;
      }

      .psb-progress {
        height: 10px;
        border-radius: 999px;
        background: rgba(255,255,255,.10);
        overflow:hidden;
        border: 1px solid rgba(255,255,255,.10);
      }
      .psb-progress > div {
        height: 100%;
        width: 0%;
        background: rgba(255,204,0,.95);
      }

      .psb-execbar {
        display:flex;
        gap: 8px;
        overflow-x: auto;
        padding: 10px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.05);
        margin: 10px 0 12px 0;
      }
      .psb-execchip {
        display:flex;
        align-items:center;
        gap: 10px;
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.08);
        white-space: nowrap;
        user-select:none;
      }
      .psb-execchip.active { outline: 2px solid rgba(255,204,0,.9); }
      .psb-execchip.locked { border-color: rgba(255,204,0,.45); }
      .psb-execname { font: 12px/1 system-ui; font-weight: 900; max-width: 260px; overflow:hidden; text-overflow: ellipsis; }
      .psb-execmeta { font: 11px/1 system-ui; opacity: .75; }
      .psb-execgroup { display:flex; gap: 6px; align-items:center; }

      .psb-timeline {
        display:flex;
        gap: 8px;
        overflow-x: auto;
        padding: 8px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.05);
      }
      .psb-titem {
        min-width: 220px;
        max-width: 320px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        padding: 8px 10px;
      }
      .psb-titem.next { outline: 2px solid rgba(255,204,0,.85); }
      .psb-tk { font: 11px/1.2 system-ui; opacity: .75; }
      .psb-tv { font: 12px/1.35 ui-monospace; opacity: .90; margin-top: 6px; }

      #${MINI_ID} {
        position: fixed; right: 18px; bottom: 86px;
        z-index: 2147483647;
        width: 460px;
        background: rgba(22,22,22,.97);
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 16px;
        box-shadow: 0 18px 50px rgba(0,0,0,.55);
        padding: 12px;
      }
      .psb-mini-title { font: 12px/1.2 system-ui; font-weight: 900; margin-bottom: 6px; display:flex; align-items:center; gap:10px; }
      .psb-mini-title .t { flex: 1; opacity: .95; }
      .psb-mini-meta { font: 12px/1.3 system-ui; opacity: .78; margin-bottom: 10px; }
      .psb-mini-row { display:flex; gap: 8px; flex-wrap: wrap; }
      .psb-snippet { font: 11px/1.3 ui-monospace; opacity: .80; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    `;
    document.head.appendChild(style);
  }

  function ensureRoot() {
    ensureStyles();
    let root = document.getElementById(ROOT_ID);
    if (root) return pinRoot(root);

    root = document.createElement("div");
    root.id = ROOT_ID;
    pinRoot(root);

    const bubble = document.createElement("div");
    bubble.className = "psb-bubble";
    bubble.textContent = "PS";
    Object.assign(bubble.style, {
      width: "54px",
      height: "54px",
      borderRadius: "16px",
      background: "rgba(20,20,20,.92)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 12px 32px rgba(0,0,0,.38)",
      cursor: "pointer",
      userSelect: "none",
      font: "14px/1 system-ui, -apple-system, Segoe UI, Roboto, Arial",
      border: "1px solid rgba(255,255,255,.10)"
    });
    bubble.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleModal(!state.ui.modalOpen);
    });

    const badge = document.createElement("div");
    badge.className = "psb-badge";
    badge.style.display = "none";

    root.appendChild(bubble);
    root.appendChild(badge);
    overlayHost().appendChild(root);
    return root;
  }

  function updateBubble() {
    ensureRoot();
    const root = document.getElementById(ROOT_ID);
    pinRoot(root);
    const badge = root.querySelector(".psb-badge");
    const active = getActiveSeries();
    const n = active ? (active.prompts || []).length : 0;
    if (n > 0) {
      badge.style.display = "flex";
      badge.textContent = String(n);
    } else {
      badge.style.display = "none";
    }
  }

  function toggleModal(open) {
    state.ui.modalOpen = open;
    if (open) state.ui.minimized = false;

    document.querySelectorAll(".psb-modal-backdrop, .psb-modal").forEach((n) => n.remove());
    document.getElementById(MINI_ID)?.remove();

    saveState(state);
    window.__psbState = state;

    if (!open) return;
    renderModal();
  }

  function setMaximized(on) {
    state.ui.maximized = !!on;
    saveState(state);
    window.__psbState = state;
    renderIfOpen();
  }

  function minimizeToDock() {
    state.ui.minimized = true;
    state.ui.modalOpen = false;
    saveState(state);
    window.__psbState = state;
    document.querySelectorAll(".psb-modal-backdrop, .psb-modal").forEach((n) => n.remove());
    renderMini();
  }

  function restoreFromDock(openMax = false) {
    state.ui.minimized = false;
    state.ui.modalOpen = true;
    state.ui.maximized = !!openMax;
    saveState(state);
    window.__psbState = state;
    document.getElementById(MINI_ID)?.remove();
    renderModal();
  }

  function confirmExit() {
    const ok = confirm("Exit Prompt Bubble? This stops the script and removes the UI.");
    if (!ok) return;
    window.__psbStop(false);
  }

  function getNextSnippetForSeries(series) {
    const nextId = syncNextPointer(series, false);
    if (!nextId) return "Next: (done)";
    const p = findPrompt(series, nextId);
    const t = (p?.text || "").replace(/\s+/g, " ").trim();
    return "Next: " + (t ? t.slice(0, 180) : "(empty)");
  }

  // ============================================================
  // Execution Bar (always visible in modal)
  // ============================================================
  function renderExecutionBar(rightContainer) {
    ensureExecOrderIntegrity();

    const wrap = document.createElement("div");
    wrap.className = "psb-card";

    const top = document.createElement("div");
    top.className = "psb-topbar";
    top.style.marginBottom = "8px";

    const ttl = document.createElement("div");
    ttl.className = "title";
    ttl.textContent = "Execution Bar";

    const totalEta = computeTotalEtaAcrossExecOrder();
    const totalEtaEl = document.createElement("div");
    totalEtaEl.className = "psb-small";
    totalEtaEl.style.opacity = "0.9";
    totalEtaEl.textContent = `Total ETA: ${humanMs(totalEta)}`;

    top.appendChild(ttl);
    top.appendChild(totalEtaEl);

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "8px";
    controls.style.alignItems = "center";

    const chainChip = document.createElement("label");
    chainChip.className = "psb-chip";
    const chainCb = document.createElement("input");
    chainCb.type = "checkbox";
    chainCb.checked = !!state.global.chainEnabled;
    chainCb.addEventListener("change", () => {
      state.global.chainEnabled = chainCb.checked;
      saveState(state);
      window.__psbState = state;
      renderIfOpen();
    });
    const chainTxt = document.createElement("span");
    chainTxt.className = "psb-small";
    chainTxt.style.opacity = "0.9";
    chainTxt.textContent = "Chain across series";
    chainChip.appendChild(chainCb);
    chainChip.appendChild(chainTxt);

    controls.appendChild(chainChip);

    top.appendChild(controls);
    wrap.appendChild(top);

    const bar = document.createElement("div");
    bar.className = "psb-execbar";

    const order = state.global.execOrder || [];
    if (!order.length) {
      const empty = document.createElement("div");
      empty.className = "psb-small";
      empty.textContent = "No series in execution order.";
      bar.appendChild(empty);
    } else {
      order.forEach((id) => {
        const s = getSeriesById(id);
        if (!s) return;
        ensureSeriesRun(s);
        ensureSeriesStats(s);

        const total = s.prompts.length;
        const sent = s.prompts.filter((p) => !!p.sentAt).length;
        const locked = state.global.runningSeriesId === s.id;
        const active = state.activeSeriesId === s.id;

        const eta = computeEtaForSeries(s);
        const elapsedMs = computeElapsedSeriesMs(s);

        const chip = document.createElement("div");
        chip.className = "psb-execchip" + (active ? " active" : "") + (locked ? " locked" : "");
        chip.title = s.title;
        chip.addEventListener("click", () => setActiveSeries(s.id));

        const leftGroup = document.createElement("div");
        leftGroup.style.display = "flex";
        leftGroup.style.flexDirection = "column";
        leftGroup.style.gap = "2px";

        const nm = document.createElement("div");
        nm.className = "psb-execname";
        nm.textContent = s.title;

        const mt = document.createElement("div");
        mt.className = "psb-execmeta";

        let etaText = eta.etaMs != null ? humanMs(eta.etaMs) : "—";
        if (state.settings?.ui?.showEtaRange && eta.rangeLoMs != null && eta.rangeHiMs != null) {
          etaText = `${humanMs(eta.rangeLoMs)}–${humanMs(eta.rangeHiMs)}`;
        }

        mt.textContent = `${sent}/${total}${locked ? " • LOCK" : ""} • elapsed:${humanMs(elapsedMs)} • ETA:${etaText} • ${eta.method}/${eta.confidence}`;

        leftGroup.appendChild(nm);
        leftGroup.appendChild(mt);

        const btns = document.createElement("div");
        btns.className = "psb-execgroup";

        const lBtn = document.createElement("button");
        lBtn.className = "psb-iconbtn tiny";
        lBtn.textContent = "←";
        lBtn.title = "Move left";
        lBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          moveExecOrder(s.id, -1);
          saveState(state);
          window.__psbState = state;
          renderIfOpen();
        });

        const rBtn = document.createElement("button");
        rBtn.className = "psb-iconbtn tiny";
        rBtn.textContent = "→";
        rBtn.title = "Move right";
        rBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          moveExecOrder(s.id, +1);
          saveState(state);
          window.__psbState = state;
          renderIfOpen();
        });

        const xBtn = document.createElement("button");
        xBtn.className = "psb-iconbtn tiny danger";
        xBtn.textContent = "–";
        xBtn.title = "Remove from execution bar (does not delete series)";
        xBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          removeFromExecOrder(s.id);
          saveState(state);
          window.__psbState = state;
          renderIfOpen();
        });

        btns.appendChild(lBtn);
        btns.appendChild(rBtn);
        btns.appendChild(xBtn);

        chip.appendChild(leftGroup);
        chip.appendChild(btns);
        bar.appendChild(chip);
      });
    }

    wrap.appendChild(bar);
    rightContainer.appendChild(wrap);
  }

  // ============================================================
  // Build tab (per-series paste, immutable lock after Insert)
  // ============================================================
  function renderBuildTab(right, active) {
    ensureSeriesPaste(active);
    recomputeSeriesPastePreview(active);

    const card = document.createElement("div");
    card.className = "psb-card";

    const h = document.createElement("div");
    h.className = "psb-h";
    h.textContent = `Build (for: ${active.title})`;
    card.appendChild(h);

    const meta = document.createElement("div");
    meta.className = "psb-small";
    const lockState = active.paste.lockEnabled
      ? active.paste.locked
        ? `LOCKED • hash:${active.paste.sourceHash || "—"} • at:${active.paste.lockedAt ? new Date(active.paste.lockedAt).toLocaleString() : "—"}`
        : "Lock enabled (will lock after Insert)"
      : "Lock disabled";
    meta.textContent = `Per-series paste. ${lockState}`;
    card.appendChild(meta);

    const row = document.createElement("div");
    row.className = "psb-row";

    const autoChip = document.createElement("label");
    autoChip.className = "psb-chip";
    const autoCb = document.createElement("input");
    autoCb.type = "checkbox";
    autoCb.checked = !!active.paste.autoSplitOnPaste;
    autoCb.addEventListener("change", () => {
      active.paste.autoSplitOnPaste = autoCb.checked;
      active.updatedAt = nowISO();
      saveState(state);
      window.__psbState = state;
    });
    const autoTxt = document.createElement("span");
    autoTxt.className = "psb-small";
    autoTxt.style.opacity = "0.9";
    autoTxt.textContent = "Auto-split on paste";
    autoChip.appendChild(autoCb);
    autoChip.appendChild(autoTxt);

    const modeSel = document.createElement("select");
    modeSel.className = "psb-select";
    modeSel.style.maxWidth = "220px";
    [
      ["replace", "Replace prompts"],
      ["append", "Append prompts"]
    ].forEach(([value, label]) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      modeSel.appendChild(opt);
    });
    modeSel.value = active.paste.insertMode;
    modeSel.addEventListener("change", () => {
      active.paste.insertMode = modeSel.value;
      active.updatedAt = nowISO();
      saveState(state);
      window.__psbState = state;
    });

    const lockChip = document.createElement("label");
    lockChip.className = "psb-chip";
    const lockCb = document.createElement("input");
    lockCb.type = "checkbox";
    lockCb.checked = !!active.paste.lockEnabled;
    lockCb.addEventListener("change", () => {
      active.paste.lockEnabled = lockCb.checked;
      // if disabling lock while locked, keep locked but allow unlock path
      active.updatedAt = nowISO();
      saveState(state);
      window.__psbState = state;
      renderIfOpen();
    });
    const lockTxt = document.createElement("span");
    lockTxt.className = "psb-small";
    lockTxt.style.opacity = "0.9";
    lockTxt.textContent = "Lock provenance after Insert";
    lockChip.appendChild(lockCb);
    lockChip.appendChild(lockTxt);

    const unlockBtn = document.createElement("button");
    unlockBtn.className = "psb-btn";
    unlockBtn.textContent = active.paste.locked ? "Unlock paste" : "Relock paste";
    unlockBtn.addEventListener("click", () => {
      if (active.paste.locked) {
        const ok = confirm("Unlock paste for editing?\n\nThis breaks immutability until you relock.");
        if (!ok) return;
        active.paste.locked = false;
        // Keep sourceRaw/sourceHash intact as provenance record
      } else {
        // relock current raw as new version (requires confirm if it differs)
        const newRaw = normalizeText(active.paste.raw);
        const oldHash = active.paste.sourceHash;
        const newHash = hashText(newRaw);
        if (oldHash && newHash !== oldHash) {
          const ok = confirm("Relock will create a NEW provenance version (hash changes).\nProceed?");
          if (!ok) return;
        }
        active.paste.sourceRaw = newRaw;
        active.paste.sourceHash = newHash;
        active.paste.locked = true;
        active.paste.lockedAt = nowISO();
      }
      active.updatedAt = nowISO();
      saveState(state);
      window.__psbState = state;
      renderIfOpen();
    });

    row.appendChild(autoChip);
    row.appendChild(modeSel);
    row.appendChild(lockChip);
    row.appendChild(unlockBtn);
    card.appendChild(row);

    const ta = document.createElement("textarea");
    ta.className = "psb-textarea";
    ta.placeholder =
      "Paste a prompt chain here…\n" +
      "Split rules: delimiter lines (----/⸻/***) → Prompt N headers → numbered blocks → double blank lines\n" +
      "Ignores separators inside ```/~~~ code fences.";

    ta.value = active.paste.raw || "";
    ta.readOnly = !!(active.paste.lockEnabled && active.paste.locked);

    const previewCount = document.createElement("div");
    previewCount.className = "psb-small";
    previewCount.style.marginTop = "10px";

    const refreshPreviewLight = () => {
      recomputeSeriesPastePreview(active);
      active.paste.lastEditedAt = nowISO();
      active.updatedAt = nowISO();
      saveState(state);
      window.__psbState = state;
      previewCount.textContent = `${active.paste.preview.length} prompt(s) detected`;
    };

    ta.addEventListener("input", () => {
      if (active.paste.lockEnabled && active.paste.locked) return;
      active.paste.raw = ta.value;
      refreshPreviewLight();
    });

    ta.addEventListener("paste", () => {
      if (active.paste.lockEnabled && active.paste.locked) return;
      if (!active.paste.autoSplitOnPaste) return;
      setTimeout(() => {
        active.paste.raw = ta.value;
        refreshPreviewLight();
        renderIfOpen();
      }, 0);
    });

    card.appendChild(ta);

    previewCount.textContent = `${active.paste.preview.length} prompt(s) detected`;
    card.appendChild(previewCount);

    const preview = document.createElement("div");
    preview.style.marginTop = "10px";
    const list = (active.paste.preview || []).slice(0, 6);

    if (list.length) {
      list.forEach((p, i) => {
        const sn = document.createElement("div");
        sn.className = "psb-small";
        sn.style.opacity = "0.85";
        sn.style.margin = "6px 0";
        sn.textContent = `${i + 1}. ${String(p).replace(/\s+/g, " ").trim().slice(0, 160)}${
          String(p).length > 160 ? "…" : ""
        }`;
        preview.appendChild(sn);
      });
      if (active.paste.preview.length > 6) {
        const more = document.createElement("div");
        more.className = "psb-small";
        more.style.opacity = "0.7";
        more.textContent = `…and ${active.paste.preview.length - 6} more`;
        preview.appendChild(more);
      }
    } else {
      const empty = document.createElement("div");
      empty.className = "psb-small";
      empty.textContent = "Preview will appear after paste/split.";
      preview.appendChild(empty);
    }

    card.appendChild(preview);

    const actions = document.createElement("div");
    actions.className = "psb-row";

    const insertBtn = document.createElement("button");
    insertBtn.className = "psb-btn";
    insertBtn.textContent = "Insert";
    insertBtn.addEventListener("click", () => insertSeriesPastePreviewIntoSeries(false));

    const insertRunBtn = document.createElement("button");
    insertRunBtn.className = "psb-btn primary";
    insertRunBtn.textContent = "Insert & Run";
    insertRunBtn.addEventListener("click", () => insertSeriesPastePreviewIntoSeries(true));

    const clearPasteBtn = document.createElement("button");
    clearPasteBtn.className = "psb-btn";
    clearPasteBtn.textContent = "Clear paste (this series)";
    clearPasteBtn.addEventListener("click", () => {
      if (active.paste.lockEnabled && active.paste.locked) {
        toast("Paste is locked; unlock to clear.");
        return;
      }
      const ok = confirm("Clear the paste buffer for THIS series? (Does not delete prompts)");
      if (!ok) return;
      active.paste.raw = "";
      active.paste.preview = [];
      active.paste.lastEditedAt = nowISO();
      active.updatedAt = nowISO();
      saveState(state);
      window.__psbState = state;
      renderIfOpen();
    });

    actions.appendChild(insertBtn);
    actions.appendChild(insertRunBtn);
    actions.appendChild(clearPasteBtn);
    card.appendChild(actions);

    right.appendChild(card);
  }

  // ============================================================
  // Prompts tab: edit, merge->next, reorder, delete, add
  // ============================================================
  function renderPromptsTab(right, active) {
    syncNextPointer(active, false);
    const run = ensureSeriesRun(active);

    const card = document.createElement("div");
    card.className = "psb-card";
    const h = document.createElement("div");
    h.className = "psb-h";
    h.textContent = "Prompts";
    card.appendChild(h);

    const meta = document.createElement("div");
    meta.className = "psb-small";
    meta.textContent = "Edit prompts inline. Merge → next. Reorder with ↑/↓. Durations appear after completion.";
    card.appendChild(meta);

    const topRow = document.createElement("div");
    topRow.className = "psb-row";

    const addBtn = document.createElement("button");
    addBtn.className = "psb-btn primary";
    addBtn.textContent = "+ Add prompt";
    addBtn.addEventListener("click", () => {
      active.prompts.push({
        id: uid(),
        text: "",
        sentAt: null,
        completedAt: null,
        durationMs: null
      });
      active.updatedAt = nowISO();
      saveState(state);
      window.__psbState = state;
      renderIfOpen();
    });

    const resetSentBtn = document.createElement("button");
    resetSentBtn.className = "psb-btn";
    resetSentBtn.textContent = "Reset ALL sent";
    resetSentBtn.addEventListener("click", () => {
      const ok = confirm("Reset sent/completed flags for ALL prompts in this series?");
      if (!ok) return;
      active.prompts.forEach((p) => {
        p.sentAt = null;
        p.completedAt = null;
        p.durationMs = null;
      });
      active.updatedAt = nowISO();
      saveState(state);
      window.__psbState = state;
      renderIfOpen();
    });

    topRow.appendChild(addBtn);
    topRow.appendChild(resetSentBtn);
    card.appendChild(topRow);

    (active.prompts || []).forEach((p, idx) => {
      const row = document.createElement("div");
      row.className = "psb-card";
      row.style.margin = "10px 0";
      row.style.background = "rgba(255,255,255,.05)";

      const head = document.createElement("div");
      head.className = "psb-row";
      head.style.margin = "0 0 8px 0";

      const lab = document.createElement("div");
      lab.className = "psb-small";
      const isNext = run.nextPromptId === p.id && !p.sentAt;
      lab.textContent =
        `${idx + 1}/${active.prompts.length}` +
        (isNext ? " • NEXT" : "") +
        (p.sentAt ? " • SENT" : "") +
        (p.durationMs != null ? ` • dur:${humanMs(p.durationMs)}` : "");

      const upBtn = document.createElement("button");
      upBtn.className = "psb-iconbtn tiny";
      upBtn.textContent = "↑";
      upBtn.title = "Move up";
      upBtn.addEventListener("click", () => movePrompt(active, p.id, -1));

      const dnBtn = document.createElement("button");
      dnBtn.className = "psb-iconbtn tiny";
      dnBtn.textContent = "↓";
      dnBtn.title = "Move down";
      dnBtn.addEventListener("click", () => movePrompt(active, p.id, +1));

      const mergeBtn = document.createElement("button");
      mergeBtn.className = "psb-btn";
      mergeBtn.textContent = "Merge → next";
      mergeBtn.disabled = idx >= active.prompts.length - 1;
      mergeBtn.addEventListener("click", () => mergePromptToNext(active, p.id));

      const delBtn = document.createElement("button");
      delBtn.className = "psb-iconbtn tiny danger";
      delBtn.textContent = "🗑";
      delBtn.title = "Delete prompt";
      delBtn.addEventListener("click", () => {
        const ok = confirm(`Delete prompt #${idx + 1}?`);
        if (!ok) return;
        deletePrompt(active, p.id);
      });

      head.appendChild(lab);
      head.appendChild(upBtn);
      head.appendChild(dnBtn);
      head.appendChild(mergeBtn);
      head.appendChild(delBtn);

      const ta = document.createElement("textarea");
      ta.className = "psb-textarea";
      ta.style.minHeight = "80px";
      ta.value = p.text || "";
      ta.addEventListener("input", () => {
        p.text = ta.value;
        // editing should clear sent if you want strictness? (we won’t auto-clear; user controls)
        active.updatedAt = nowISO();
        saveState(state);
        window.__psbState = state;
        syncNextPointer(active, false);
      });

      const sentRow = document.createElement("div");
      sentRow.className = "psb-row";
      sentRow.style.margin = "8px 0 0 0";

      const sentChip = document.createElement("label");
      sentChip.className = "psb-chip";

      const sentCb = document.createElement("input");
      sentCb.type = "checkbox";
      sentCb.checked = !!p.sentAt;
      sentCb.addEventListener("change", () => {
        if (sentCb.checked) {
          p.sentAt = nowISO();
          p.completedAt = p.sentAt;
          if (p.durationMs == null) p.durationMs = null;
        } else {
          p.sentAt = null;
          p.completedAt = null;
          p.durationMs = null;
        }
        active.updatedAt = nowISO();
        saveState(state);
        window.__psbState = state;
        syncNextPointer(active, true);
        renderIfOpen();
      });

      const sentTxt = document.createElement("span");
      sentTxt.className = "psb-small";
      sentTxt.style.opacity = "0.9";
      sentTxt.textContent = "Mark sent";

      sentChip.appendChild(sentCb);
      sentChip.appendChild(sentTxt);

      sentRow.appendChild(sentChip);

      row.appendChild(head);
      row.appendChild(ta);
      row.appendChild(sentRow);

      card.appendChild(row);
    });

    right.appendChild(card);
  }

  // ============================================================
  // Run tab: runner card + prompt timeline + ETA
  // ============================================================
  function renderRunTab(right, active) {
    ensureSeriesRun(active);
    ensureSeriesStats(active);
    syncNextPointer(active, false);

    const run = active.run;

    const total = active.prompts.length;
    const sent = active.prompts.filter((p) => !!p.sentAt).length;
    const pct = total ? Math.round((sent / total) * 100) : 0;

    const eta = computeEtaForSeries(active);
    const elapsedMs = computeElapsedSeriesMs(active);

    const card = document.createElement("div");
    card.className = "psb-card";

    const h = document.createElement("div");
    h.className = "psb-h";
    h.textContent = "Runner";
    card.appendChild(h);

    const status = document.createElement("div");
    status.className = "psb-small";
    const btnState = getSendBtnState();
    const lock = state.global.runningSeriesId === active.id ? "THIS" : (state.global.runningSeriesId || "none");
    const nextId = active.run.nextPromptId;
    const nextIdx = nextId ? active.prompts.findIndex((p) => p.id === nextId) : -1;

    let etaText = eta.etaMs != null ? humanMs(eta.etaMs) : "—";
    if (state.settings?.ui?.showEtaRange && eta.rangeLoMs != null && eta.rangeHiMs != null) {
      etaText = `${humanMs(eta.rangeLoMs)}–${humanMs(eta.rangeHiMs)}`;
    }

    status.textContent =
      `Status: ${run.lastStatus}${run.waiting ? " (waiting)" : ""}` +
      `${run.lastError ? " • error: " + run.lastError : ""}` +
      ` • btn:${btnState}` +
      ` • lock:${lock}` +
      ` • next:${nextIdx >= 0 ? `${nextIdx + 1}/${total}` : "—"}` +
      ` • elapsed:${humanMs(elapsedMs)}` +
      ` • ETA:${etaText} • ${eta.method}/${eta.confidence}`;

    card.appendChild(status);

    const prog = document.createElement("div");
    prog.className = "psb-progress";
    const fill = document.createElement("div");
    fill.style.width = `${pct}%`;
    prog.appendChild(fill);
    card.appendChild(prog);

    const nextSnippet = document.createElement("div");
    nextSnippet.className = "psb-small";
    nextSnippet.style.marginTop = "8px";
    nextSnippet.textContent = getNextSnippetForSeries(active);
    card.appendChild(nextSnippet);

    const toggles = document.createElement("div");
    toggles.className = "psb-row";

    const autoRunChip = document.createElement("label");
    autoRunChip.className = "psb-chip";
    const autoRunCb = document.createElement("input");
    autoRunCb.type = "checkbox";
    autoRunCb.checked = !!run.autoRun;
    autoRunCb.addEventListener("change", () => {
      run.autoRun = autoRunCb.checked;
      if (run.autoRun) run.autoLoadOnly = false;
      active.updatedAt = nowISO();
      saveState(state);
      window.__psbState = state;
      renderIfOpen();
    });
    const autoRunTxt = document.createElement("span");
    autoRunTxt.className = "psb-small";
    autoRunTxt.style.opacity = "0.9";
    autoRunTxt.textContent = "Auto-send after completion";
    autoRunChip.appendChild(autoRunCb);
    autoRunChip.appendChild(autoRunTxt);

    const loadOnlyChip = document.createElement("label");
    loadOnlyChip.className = "psb-chip";
    const loadOnlyCb = document.createElement("input");
    loadOnlyCb.type = "checkbox";
    loadOnlyCb.checked = !!run.autoLoadOnly;
    loadOnlyCb.addEventListener("change", () => {
      run.autoLoadOnly = loadOnlyCb.checked;
      if (run.autoLoadOnly) run.autoRun = false;
      active.updatedAt = nowISO();
      saveState(state);
      window.__psbState = state;
      renderIfOpen();
    });
    const loadOnlyTxt = document.createElement("span");
    loadOnlyTxt.className = "psb-small";
    loadOnlyTxt.style.opacity = "0.9";
    loadOnlyTxt.textContent = "Load-only (never clicks send)";
    loadOnlyChip.appendChild(loadOnlyCb);
    loadOnlyChip.appendChild(loadOnlyTxt);

    toggles.appendChild(autoRunChip);
    toggles.appendChild(loadOnlyChip);
    card.appendChild(toggles);

    const row = document.createElement("div");
    row.className = "psb-row";

    const start = document.createElement("button");
    start.className = "psb-btn primary";
    start.textContent = run.running ? "Running…" : "Start";
    start.disabled = run.running && run.waiting;
    start.addEventListener("click", () => startRun());

    const pause = document.createElement("button");
    pause.className = "psb-btn";
    pause.textContent = run.running ? "Pause" : "Resume";
    pause.addEventListener("click", () => {
      run.running ? pauseRun() : resumeRun();
    });

    const sendOne = document.createElement("button");
    sendOne.className = "psb-btn";
    sendOne.textContent = "Send Next";
    sendOne.addEventListener("click", () => {
      const r = ensureSeriesRun(active);
      if (!r.running) resumeRun();
      else sendNext(false);
    });

    const clearRun = document.createElement("button");
    clearRun.className = "psb-btn danger";
    clearRun.textContent = "Clear run state";
    clearRun.addEventListener("click", () => {
      const ok = confirm("Clear run state for this series?");
      if (!ok) return;
      clearRunStateForActiveSeries();
    });

    row.appendChild(start);
    row.appendChild(pause);
    row.appendChild(sendOne);
    row.appendChild(clearRun);
    card.appendChild(row);

    right.appendChild(card);

    // Prompt Timeline (clear “after which”)
    const tl = document.createElement("div");
    tl.className = "psb-card";
    const th = document.createElement("div");
    th.className = "psb-h";
    th.textContent = `Prompt Timeline (${active.prompts.length} total)`;
    tl.appendChild(th);

    const strip = document.createElement("div");
    strip.className = "psb-timeline";

    const nextId2 = syncNextPointer(active, false);
    const idxNext = nextId2 ? active.prompts.findIndex((p) => p.id === nextId2) : -1;

    const startIdx = 0;
    const endIdx = active.prompts.length;

    for (let i = startIdx; i < endIdx; i++) {
      const p = active.prompts[i];
      const box = document.createElement("div");
      box.className = "psb-titem" + (p.id === nextId2 && !p.sentAt ? " next" : "");

      const k = document.createElement("div");
      k.className = "psb-tk";
      k.textContent =
        `#${i + 1}` +
        (p.sentAt ? " • SENT" : " • unsent") +
        (p.durationMs != null ? ` • ${humanMs(p.durationMs)}` : "");

      const v = document.createElement("div");
      v.className = "psb-tv";
      v.textContent = computePreview(p.text, 180);

      box.appendChild(k);
      box.appendChild(v);
      strip.appendChild(box);
    }

    if (!active.prompts.length) {
      const empty = document.createElement("div");
      empty.className = "psb-small";
      empty.textContent = "No prompts yet. Use Build → Insert or copy-capture.";
      strip.appendChild(empty);
    }

    tl.appendChild(strip);
    right.appendChild(tl);
  }

  // ============================================================
  // Settings panel (inline, no extra tab)
  // ============================================================
  function renderSettingsPanel(right) {
    const s = state.settings;

    const card = document.createElement("div");
    card.className = "psb-card";

    const h = document.createElement("div");
    h.className = "psb-h";
    h.textContent = "Settings";
    card.appendChild(h);

    const note = document.createElement("div");
    note.className = "psb-small";
    note.textContent =
      "Series naming template supports {type} {date} {time} {preview:N}. ETA uses EMA/median/trimmed mean when possible.";
    card.appendChild(note);

    // naming template
    const tpl = document.createElement("input");
    tpl.className = "psb-input";
    tpl.value = s.naming.template;
    tpl.placeholder = "{type} {date} {time} — {preview:44}";
    tpl.addEventListener("input", () => {
      s.naming.template = tpl.value;
      saveState(state);
      window.__psbState = state;
    });

    const defType = document.createElement("input");
    defType.className = "psb-input";
    defType.value = s.naming.defaultType;
    defType.placeholder = "Default capture type (e.g. Captured / Paste / Spec)";
    defType.addEventListener("input", () => {
      s.naming.defaultType = defType.value;
      saveState(state);
      window.__psbState = state;
    });

    const etaRow = document.createElement("div");
    etaRow.className = "psb-row";

    const hist = document.createElement("input");
    hist.className = "psb-input";
    hist.style.maxWidth = "180px";
    hist.type = "number";
    hist.min = "10";
    hist.max = "300";
    hist.value = String(s.eta.maxHistory);
    hist.addEventListener("input", () => {
      s.eta.maxHistory = clamp(parseInt(hist.value || "50", 10), 10, 300);
      saveState(state);
      window.__psbState = state;
    });

    const alpha = document.createElement("input");
    alpha.className = "psb-input";
    alpha.style.maxWidth = "180px";
    alpha.type = "number";
    alpha.step = "0.05";
    alpha.min = "0.05";
    alpha.max = "0.8";
    alpha.value = String(s.eta.emaAlpha);
    alpha.addEventListener("input", () => {
      s.eta.emaAlpha = clamp(parseFloat(alpha.value || "0.3"), 0.05, 0.8);
      saveState(state);
      window.__psbState = state;
    });

    etaRow.appendChild(labelWrap("Name template", tpl));
    etaRow.appendChild(labelWrap("Default capture type", defType));
    etaRow.appendChild(labelWrap("ETA history N", hist));
    etaRow.appendChild(labelWrap("EMA alpha", alpha));

    card.appendChild(etaRow);

    const rngChip = document.createElement("label");
    rngChip.className = "psb-chip";
    const rngCb = document.createElement("input");
    rngCb.type = "checkbox";
    rngCb.checked = !!s.ui.showEtaRange;
    rngCb.addEventListener("change", () => {
      s.ui.showEtaRange = rngCb.checked;
      saveState(state);
      window.__psbState = state;
      renderIfOpen();
    });
    const rngTxt = document.createElement("span");
    rngTxt.className = "psb-small";
    rngTxt.style.opacity = "0.9";
    rngTxt.textContent = "Show ETA range (robust)";
    rngChip.appendChild(rngCb);
    rngChip.appendChild(rngTxt);

    card.appendChild(rngChip);

    right.appendChild(card);

    const autoCard = document.createElement("div");
    autoCard.className = "psb-card";

    const autoTitle = document.createElement("div");
    autoTitle.className = "psb-h";
    autoTitle.textContent = "Button automations";
    autoCard.appendChild(autoTitle);

    const autoNote = document.createElement("div");
    autoNote.className = "psb-small";
    autoNote.textContent =
      "Configure allow access/retry/auto-fix and prompt-chain delay. Prompt-chain delay is enforced to be ≥ max button countdown.";
    autoCard.appendChild(autoNote);

    const auto = getAutoSettings();

    const allowChip = document.createElement("label");
    allowChip.className = "psb-chip";
    const allowCb = document.createElement("input");
    allowCb.type = "checkbox";
    allowCb.checked = auto.allowAccess?.enabled !== false;
    const allowTxt = document.createElement("span");
    allowTxt.className = "psb-small";
    allowTxt.style.opacity = "0.9";
    allowTxt.textContent = "Allow access";
    allowChip.appendChild(allowCb);
    allowChip.appendChild(allowTxt);

    const allowMs = document.createElement("input");
    allowMs.className = "psb-input";
    allowMs.style.maxWidth = "220px";
    allowMs.type = "number";
    allowMs.min = "0";
    allowMs.max = "300000";
    allowMs.value = String(auto.allowAccess?.countdownMs ?? 3000);

    const retryChip = document.createElement("label");
    retryChip.className = "psb-chip";
    const retryCb = document.createElement("input");
    retryCb.type = "checkbox";
    retryCb.checked = auto.retry?.enabled !== false;
    const retryTxt = document.createElement("span");
    retryTxt.className = "psb-small";
    retryTxt.style.opacity = "0.9";
    retryTxt.textContent = "Retry";
    retryChip.appendChild(retryCb);
    retryChip.appendChild(retryTxt);

    const retrySec = document.createElement("input");
    retrySec.className = "psb-input";
    retrySec.style.maxWidth = "220px";
    retrySec.type = "number";
    retrySec.min = "0";
    retrySec.max = "120";
    retrySec.value = String(auto.retry?.countdownSec ?? 3);

    const fixChip = document.createElement("label");
    fixChip.className = "psb-chip";
    const fixCb = document.createElement("input");
    fixCb.type = "checkbox";
    fixCb.checked = auto.autoFix?.enabled !== false;
    const fixTxt = document.createElement("span");
    fixTxt.className = "psb-small";
    fixTxt.style.opacity = "0.9";
    fixTxt.textContent = "Auto-fix";
    fixChip.appendChild(fixCb);
    fixChip.appendChild(fixTxt);

    const fixSec = document.createElement("input");
    fixSec.className = "psb-input";
    fixSec.style.maxWidth = "220px";
    fixSec.type = "number";
    fixSec.min = "0";
    fixSec.max = "120";
    fixSec.value = String(auto.autoFix?.countdownSec ?? 3);

    const chainDelay = document.createElement("input");
    chainDelay.className = "psb-input";
    chainDelay.style.maxWidth = "220px";
    chainDelay.type = "number";
    chainDelay.min = "0";
    chainDelay.max = "300000";
    chainDelay.value = String(auto.promptChain?.interPromptDelayMs ?? INTER_PROMPT_DELAY_DEFAULT_MS);

    const derived = document.createElement("div");
    derived.className = "psb-small";
    derived.style.marginTop = "6px";

    const updateDerived = () => {
      const cur = getAutoSettings();
      const maxMs = computeMaxBtnCountdownMs(cur);
      const rawDelay = cur.promptChain?.interPromptDelayMs ?? INTER_PROMPT_DELAY_DEFAULT_MS;
      const effDelay = Math.max(rawDelay, maxMs);
      derived.textContent = `Max btn countdown: ${humanMs(maxMs)} • Prompt-chain delay: ${humanMs(effDelay)} (min ${humanMs(maxMs)})`;
    };

    const applyAutoPatch = (patch) => {
      const next = saveAutoSettings(patch);
      const maxMs = computeMaxBtnCountdownMs(next);
      const rawDelay = next.promptChain?.interPromptDelayMs ?? INTER_PROMPT_DELAY_DEFAULT_MS;
      if (rawDelay < maxMs) {
        saveAutoSettings({ promptChain: { interPromptDelayMs: maxMs } });
      }
      const cur = getAutoSettings();
      chainDelay.value = String(cur.promptChain?.interPromptDelayMs ?? INTER_PROMPT_DELAY_DEFAULT_MS);
      updateDerived();
    };

    allowCb.addEventListener("change", () => applyAutoPatch({ allowAccess: { enabled: allowCb.checked } }));
    allowMs.addEventListener("change", () =>
      applyAutoPatch({ allowAccess: { countdownMs: clamp(parseInt(allowMs.value || "0", 10), 0, 300000) } })
    );
    retryCb.addEventListener("change", () => applyAutoPatch({ retry: { enabled: retryCb.checked } }));
    retrySec.addEventListener("change", () =>
      applyAutoPatch({ retry: { countdownSec: clamp(parseInt(retrySec.value || "0", 10), 0, 120) } })
    );
    fixCb.addEventListener("change", () => applyAutoPatch({ autoFix: { enabled: fixCb.checked } }));
    fixSec.addEventListener("change", () =>
      applyAutoPatch({ autoFix: { countdownSec: clamp(parseInt(fixSec.value || "0", 10), 0, 120) } })
    );
    chainDelay.addEventListener("change", () =>
      applyAutoPatch({
        promptChain: { interPromptDelayMs: clamp(parseInt(chainDelay.value || "0", 10), 0, 300000) }
      })
    );

    const row1 = document.createElement("div");
    row1.className = "psb-row";
    row1.appendChild(allowChip);
    row1.appendChild(labelWrap("Allow access countdown (ms)", allowMs));

    const row2 = document.createElement("div");
    row2.className = "psb-row";
    row2.appendChild(retryChip);
    row2.appendChild(labelWrap("Retry countdown (s)", retrySec));

    const row3 = document.createElement("div");
    row3.className = "psb-row";
    row3.appendChild(fixChip);
    row3.appendChild(labelWrap("Auto-fix countdown (s)", fixSec));

    const row4 = document.createElement("div");
    row4.className = "psb-row";
    row4.appendChild(labelWrap("Prompt-chain delay (ms)", chainDelay));

    autoCard.appendChild(row1);
    autoCard.appendChild(row2);
    autoCard.appendChild(row3);
    autoCard.appendChild(row4);
    autoCard.appendChild(derived);
    applyAutoPatch({});

    right.appendChild(autoCard);

    function labelWrap(label, el) {
      const box = document.createElement("div");
      box.style.minWidth = "240px";
      const l = document.createElement("div");
      l.className = "psb-small";
      l.style.marginBottom = "6px";
      l.textContent = label;
      box.appendChild(l);
      box.appendChild(el);
      return box;
    }
  }

  // ============================================================
  // Mini panel (fixed maximize + informative tools)
  // ============================================================
  function renderMini() {
    document.getElementById(MINI_ID)?.remove();
    if (!state.ui.minimized) return;

    const s = ensureActiveSeries();
    ensureSeriesRun(s);
    syncNextPointer(s, false);

    const run = s.run;
    const total = s.prompts.length;
    const sent = s.prompts.filter((p) => !!p.sentAt).length;

    const eta = computeEtaForSeries(s);
    const elapsedMs = computeElapsedSeriesMs(s);

    const box = document.createElement("div");
    box.id = MINI_ID;

    box.addEventListener("mousedown", (e) => e.stopPropagation(), true);
    box.addEventListener("click", (e) => e.stopPropagation(), true);

    const title = document.createElement("div");
    title.className = "psb-mini-title";
    const titleText = document.createElement("span");
    titleText.className = "t";
    titleText.textContent = "Prompt Bubble";
    title.appendChild(titleText);

    const openBtn = document.createElement("button");
    openBtn.className = "psb-iconbtn";
    openBtn.textContent = "▢";
    openBtn.title = "Open";
    openBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      restoreFromDock(false);
    });

    const maxBtn = document.createElement("button");
    maxBtn.className = "psb-iconbtn";
    maxBtn.textContent = "⬜";
    maxBtn.title = "Maximize";
    maxBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      restoreFromDock(true);
    });

    const exitBtn = document.createElement("button");
    exitBtn.className = "psb-iconbtn danger";
    exitBtn.textContent = "⨯";
    exitBtn.title = "Exit";
    exitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      confirmExit();
    });

    title.appendChild(openBtn);
    title.appendChild(maxBtn);
    title.appendChild(exitBtn);

    const btnState = getSendBtnState();
    const lock = state.global.runningSeriesId ? (state.global.runningSeriesId === s.id ? "LOCK:THIS" : "LOCK:OTHER") : "LOCK:none";

    let etaText = eta.etaMs != null ? humanMs(eta.etaMs) : "—";
    if (state.settings?.ui?.showEtaRange && eta.rangeLoMs != null && eta.rangeHiMs != null) {
      etaText = `${humanMs(eta.rangeLoMs)}–${humanMs(eta.rangeHiMs)}`;
    }

    const meta = document.createElement("div");
    meta.className = "psb-mini-meta";
    meta.textContent =
      `${s.title} • ${run.lastStatus}${run.waiting ? " (waiting)" : ""}` +
      ` • ${sent}/${total}` +
      ` • elapsed:${humanMs(elapsedMs)}` +
      ` • ETA:${etaText}` +
      ` • chain:${state.global.chainEnabled ? "ON" : "off"}` +
      ` • btn:${btnState}` +
      ` • ${lock}`;

    const nextSnippet = document.createElement("div");
    nextSnippet.className = "psb-snippet";
    nextSnippet.textContent = getNextSnippetForSeries(s);

    const row = document.createElement("div");
    row.className = "psb-mini-row";

    const pauseBtn = document.createElement("button");
    pauseBtn.className = "psb-btn";
    pauseBtn.textContent = run.running ? "Pause" : "Resume";
    pauseBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      run.running ? pauseRun() : resumeRun();
    });

    const sendBtn = document.createElement("button");
    sendBtn.className = "psb-btn primary";
    sendBtn.textContent = "Send Next";
    sendBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ss = ensureActiveSeries();
      const rr = ensureSeriesRun(ss);
      if (!rr.running) resumeRun();
      else sendNext(false);
    });

    const chainBtn = document.createElement("button");
    chainBtn.className = "psb-btn";
    chainBtn.textContent = state.global.chainEnabled ? "Chain: ON" : "Chain: off";
    chainBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.global.chainEnabled = !state.global.chainEnabled;
      saveState(state);
      window.__psbState = state;
      renderIfOpen();
    });

    row.appendChild(pauseBtn);
    row.appendChild(sendBtn);
    row.appendChild(chainBtn);

    box.appendChild(title);
    box.appendChild(meta);
    box.appendChild(nextSnippet);
    box.appendChild(row);
    document.body.appendChild(box);
  }

  // ============================================================
  // Modal
  // ============================================================
  function renderModal() {
    document.querySelectorAll(".psb-modal-backdrop, .psb-modal").forEach((n) => n.remove());
    document.getElementById(MINI_ID)?.remove();

    ensureExecOrderIntegrity();

    const backdrop = document.createElement("div");
    backdrop.className = "psb-modal-backdrop";
    backdrop.addEventListener("click", (e) => {
      if (e.target !== backdrop) return;
      toggleModal(false);
    });

    const modal = document.createElement("div");
    modal.className = "psb-modal" + (state.ui.maximized ? " max" : "");
    modal.addEventListener("click", (e) => e.stopPropagation());
    modal.addEventListener("mousedown", (e) => e.stopPropagation());

    const left = document.createElement("div");
    left.className = "psb-left";

    const topL = document.createElement("div");
    topL.className = "psb-topbar";
    const topLTitle = document.createElement("div");
    topLTitle.className = "title";
    topLTitle.textContent = "Series";
    topL.appendChild(topLTitle);

    const minBtn = document.createElement("button");
    minBtn.className = "psb-iconbtn";
    minBtn.textContent = "—";
    minBtn.title = "Minimize";
    minBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      minimizeToDock();
    });

    const maxBtn = document.createElement("button");
    maxBtn.className = "psb-iconbtn";
    maxBtn.textContent = state.ui.maximized ? "🗗" : "🗖";
    maxBtn.title = state.ui.maximized ? "Unmaximize" : "Maximize";
    maxBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setMaximized(!state.ui.maximized);
    });

    const exitBtn = document.createElement("button");
    exitBtn.className = "psb-iconbtn danger";
    exitBtn.textContent = "⨯";
    exitBtn.title = "Exit";
    exitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      confirmExit();
    });

    topL.appendChild(minBtn);
    topL.appendChild(maxBtn);
    topL.appendChild(exitBtn);
    left.appendChild(topL);

    const info = document.createElement("div");
    info.className = "psb-small";
    info.textContent = "Hotkeys: Alt+Enter send next • Alt+\\ open/close • Copy capture enabled";
    left.appendChild(info);

    left.appendChild(document.createElement("div")).className = "psb-divider";

    // Series filter
    const filter = document.createElement("input");
    filter.className = "psb-input";
    filter.placeholder = "Search series… (title / preview)";
    filter.value = state.ui.seriesFilter || "";
    filter.addEventListener("input", () => {
      state.ui.seriesFilter = filter.value;
      saveState(state);
      window.__psbState = state;
      renderIfOpen();
    });
    left.appendChild(filter);

    const newSeriesBtn = document.createElement("button");
    newSeriesBtn.className = "psb-btn";
    newSeriesBtn.textContent = "+ New series";
    newSeriesBtn.addEventListener("click", () => {
      const seriesId = uid();
      const s = {
        id: seriesId,
        title: applyNameTemplate({ type: "Series", preview: "" }),
        createdAt: nowISO(),
        updatedAt: nowISO(),
        prompts: [],
        run: defaultRun(),
        paste: defaultPaste(),
        stats: defaultStats()
      };
      state.series.unshift(s);
      state.activeSeriesId = seriesId;
      addToExecOrder(seriesId, false);
      syncNextPointer(s, false);
      saveState(state);
      window.__psbState = state;
      toast("New series created.");
      renderIfOpen();
    });
    left.appendChild(newSeriesBtn);

    left.appendChild(document.createElement("div")).className = "psb-divider";

    // series list
    const q = (state.ui.seriesFilter || "").trim().toLowerCase();
    const filtered = (state.series || []).filter((s) => {
      if (!q) return true;
      const t = (s.title || "").toLowerCase();
      const pv = computePreview(s.paste?.raw || "", 80).toLowerCase();
      return t.includes(q) || pv.includes(q);
    });

    filtered.forEach((s) => {
      ensureSeriesRun(s);
      ensureSeriesPaste(s);
      ensureSeriesStats(s);
      syncNextPointer(s, false);

      const item = document.createElement("div");
      item.className = "psb-series-item" + (s.id === state.activeSeriesId ? " active" : "");
      item.addEventListener("click", () => setActiveSeries(s.id));

      const titleRow = document.createElement("div");
      titleRow.className = "psb-series-title-row";

      const title = document.createElement("div");
      title.className = "psb-series-title";
      title.textContent = s.title;

      const delBtn = document.createElement("button");
      delBtn.className = "psb-iconbtn tiny danger";
      delBtn.textContent = "🗑";
      delBtn.title = "Delete series";
      delBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = confirm(`Delete series:\n\n"${s.title}"\n\nThis cannot be undone.`);
        if (!ok) return;
        deleteSeriesById(s.id);
      });

      titleRow.appendChild(title);
      titleRow.appendChild(delBtn);
      item.appendChild(titleRow);

      const sent = (s.prompts || []).filter((p) => !!p.sentAt).length;
      const pasteLen = (s.paste?.raw || "").trim().length;

      const eta = computeEtaForSeries(s);
      const elapsedMs = computeElapsedSeriesMs(s);
      let etaText = eta.etaMs != null ? humanMs(eta.etaMs) : "—";
      if (state.settings?.ui?.showEtaRange && eta.rangeLoMs != null && eta.rangeHiMs != null) {
        etaText = `${humanMs(eta.rangeLoMs)}–${humanMs(eta.rangeHiMs)}`;
      }

      const meta = document.createElement("div");
      meta.className = "psb-series-meta";
      meta.textContent =
        `${s.prompts.length} prompts • ${sent} sent • paste:${pasteLen ? "yes" : "no"}` +
        ` • elapsed:${humanMs(elapsedMs)} • ETA:${etaText}`;
      item.appendChild(meta);

      left.appendChild(item);
    });

    const right = document.createElement("div");
    right.className = "psb-right";

    const topR = document.createElement("div");
    topR.className = "psb-topbar";
    const titleR = document.createElement("div");
    titleR.className = "title";
    titleR.textContent = "Workspace";
    topR.appendChild(titleR);

    const closeBtn = document.createElement("button");
    closeBtn.className = "psb-iconbtn";
    closeBtn.textContent = "▾";
    closeBtn.title = "Close";
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleModal(false);
    });

    topR.appendChild(closeBtn);
    right.appendChild(topR);

    const active = ensureActiveSeries();
    ensureSeriesRun(active);
    ensureSeriesPaste(active);
    ensureSeriesStats(active);
    syncNextPointer(active, false);

    const titleInput = document.createElement("input");
    titleInput.className = "psb-input";
    titleInput.placeholder = "Series title";
    titleInput.value = active.title || "";
    titleInput.addEventListener("input", () => {
      active.title = titleInput.value;
      active.updatedAt = nowISO();
      saveState(state);
      window.__psbState = state;
      renderIfOpen();
    });
    right.appendChild(titleInput);

    // Execution bar always visible (Queue moved here)
    renderExecutionBar(right);

    // Tabs (3)
    const tabs = document.createElement("div");
    tabs.className = "psb-tabs";
    const mkTab = (id, label) => {
      const t = document.createElement("div");
      t.className = "psb-tab" + (state.ui.tab === id ? " active" : "");
      t.textContent = label;
      t.addEventListener("click", () => {
        state.ui.tab = id;
        saveState(state);
        window.__psbState = state;
        renderIfOpen();
      });
      return t;
    };
    tabs.appendChild(mkTab("build", "Build"));
    tabs.appendChild(mkTab("prompts", "Prompts"));
    tabs.appendChild(mkTab("run", "Run"));
    right.appendChild(tabs);

    // Tab body
    if (state.ui.tab === "build") renderBuildTab(right, active);
    if (state.ui.tab === "prompts") renderPromptsTab(right, active);
    if (state.ui.tab === "run") renderRunTab(right, active);

    // Settings panel always below (customization)
    renderSettingsPanel(right);

    modal.appendChild(left);
    modal.appendChild(right);

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    updateBubble();
  }

  function renderIfOpen() {
    updateBubble();
    if (state.ui.modalOpen) renderModal();
    if (state.ui.minimized) renderMini();
  }

  // ============================================================
  // Key handlers
  // ============================================================
  function onKeyDown(e) {
    if (e.altKey && (e.key || "") === HOTKEY_TOGGLE.key) {
      e.preventDefault();
      toggleModal(!state.ui.modalOpen);
      return;
    }
    const match = HOTKEY_SEND_NEXT.alt === e.altKey && (e.key || "") === HOTKEY_SEND_NEXT.key;
    if (!match) return;
    e.preventDefault();

    const s = ensureActiveSeries();
    const r = ensureSeriesRun(s);
    if (!r.running) resumeRun();
    else sendNext(false);
  }

  // ============================================================
  // Boot
  // ============================================================
  migrateIfNeeded();
  ensureRoot();
  ensureActiveSeries();
  ensureExecOrderIntegrity();
  renderIfOpen();

  window.__psbCopyHandler = handleCopyCapture;
  window.__psbKeyHandler = onKeyDown;

  document.addEventListener("copy", window.__psbCopyHandler, true);
  window.addEventListener("keydown", window.__psbKeyHandler, true);

  // Observers attach lazily during run
  attachObservers();

  const uiWatchTimer = setInterval(() => {
    const root = ensureRoot();
    if (!root.isConnected) overlayHost().appendChild(root);
    updateBubble();
  }, 1000);

  window.__psbStop = (force = false) => {
    try {
      document.removeEventListener("copy", window.__psbCopyHandler, true);
    } catch {}
    try {
      window.removeEventListener("keydown", window.__psbKeyHandler, true);
    } catch {}
    detachObservers();
    clearInterval(uiWatchTimer);
    try {
      (state.series || []).forEach((s) => {
        const r = ensureSeriesRun(s);
        clearPostCompleteTimer(r);
        clearInterPromptTimer(r);
      });
    } catch {}
    document
      .querySelectorAll(`#${ROOT_ID}, #${MINI_ID}, #${CSS_ID}, .psb-modal, .psb-modal-backdrop`)
      .forEach((n) => n.remove());
    if (!force) toast("Prompt bubble stopped.");
  };
  window.__psbShow = () => {
    ensureRoot();
    state.ui.modalOpen = true;
    state.ui.minimized = false;
    saveState(state);
    window.__psbState = state;
    renderModal();
    updateBubble();
    return document.getElementById(ROOT_ID);
  };

  console.log("[psb] v2.7 running. Debug: window.__psbState");
})();
