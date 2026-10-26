(function () {
  'use strict';
  var host = window;
  try { if (window.top.location.origin === location.origin) host = window.top; } catch (_) {}
  var original = location.search;
  window.spTrackingSearch = original;
  function clean(win) {
    try {
      if (win.spTrackingSearch == null) win.spTrackingSearch = win.location.search;
      var url = new URL(win.location.href);
      Array.from(url.searchParams.keys()).forEach(function (key) {
        if (/email|name|nome|phone|tel|cid|^pm$|payer|customer|token|address/i.test(key)) url.searchParams.delete(key);
      });
      win.history.replaceState(win.history.state, '', url.pathname + url.search + url.hash);
    } catch (_) {}
  }
  clean(window); clean(host);
  if (host.spMeta) {
    window.spMeta = host.spMeta;
    document.addEventListener('click', checkoutClick, true);
    return;
  }
  var doc = host.document;
  var ID = '1769881247639430';
  var KEY = 'sp_advertising_choices';
  var NOTICE = 'meta-measurement-2026-10-26';
  var REGIONS = 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IS IE IT LI LV LT LU MT NL NO PL PT RO SK SI ES SE GB CH'.split(' ');
  var region = null, initialized = false, viewed = false, started = false;
  var checkoutElements = new WeakSet();
  function record() {
    try { var r = JSON.parse(host.localStorage.getItem(KEY)); return r && r.version === NOTICE ? r : null; } catch (_) { return null; }
  }
  function allowed() {
    if (host.navigator.globalPrivacyControl === true) return false;
    var r = record();
    if (r) return r.advertising === true;
    return region !== null && REGIONS.indexOf(region) === -1;
  }
  function sdk() {
    if (initialized) return;
    initialized = true;
    var q = host.fbq = function () {
      if (q.callMethod) q.callMethod.apply(q, arguments); else q.queue.push(Array.from(arguments));
    };
    host._fbq = q; q.push = q; q.loaded = true; q.version = '2.0'; q.queue = [];
    q('consent', 'grant');
    q('set', 'autoConfig', false, ID);
    q('init', ID, {}, { agent: 'lovable' });
    var script = doc.createElement('script'); script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    doc.head.appendChild(script);
  }
  function event(name) {
    if (name !== 'PageView' && name !== 'InitiateCheckout') return false;
    if (!allowed()) return false;
    sdk();
    host.fbq('track', name);
    return true;
  }
  function sync() {
    if (initialized) host.fbq('consent', allowed() ? 'grant' : 'revoke');
    if (allowed() && !viewed) { viewed = true; event('PageView'); }
  }
  function checkoutClick(e) {
    var target = e.target && e.target.closest && e.target.closest('a[href], [data-meta-checkout]');
    if (!target || target.disabled || checkoutElements.has(target)) return;
    var isCheckout = target.hasAttribute('data-meta-checkout');
    if (target.href) {
      try { isCheckout = /^(secure\.spot\.officialprogram\.online|go\.centerpag\.com)$/.test(new URL(target.href).hostname); } catch (_) {}
    }
    if (!isCheckout) return;
    checkoutElements.add(target);
    event('InitiateCheckout');
  }
  host.spMeta = window.spMeta = { checkout: function () { return event('InitiateCheckout'); }, settings: settings };
  document.addEventListener('click', checkoutClick, true);
  function settings() {
    var existing = doc.getElementById('sp-ad-choices');
    if (existing) { existing.hidden = false; return; }
    var panel = doc.createElement('section'); panel.id = 'sp-ad-choices';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Advertising privacy');
    panel.innerHTML = '<strong>Advertising privacy</strong><p>Allow Meta (Facebook) to receive page visits and checkout clicks, page addresses, cookie identifiers, IP address and browser information for ad measurement and optimization? You can change your choice in Cookie settings.</p><div><button type="button" data-choice="no">Reject</button><button type="button" data-choice="yes">Accept</button><a href="/sp/privacy.html" target="_blank" rel="noopener">Privacy policy</a></div>';
    doc.body.appendChild(panel);
    panel.querySelectorAll('[data-choice]').forEach(function (button) {
      button.addEventListener('click', function () {
        var old = record();
        var visitor;
        try { visitor = old && old.visitor || host.crypto.randomUUID(); } catch (_) { visitor = 'visitor-' + Date.now(); }
        var choice = button.getAttribute('data-choice') === 'yes';
        var evidence = { visitor: visitor, version: NOTICE, advertising: choice, region: region, at: new Date().toISOString(), previousAcceptance: old && (old.advertising ? old.at : old.previousAcceptance) || null };
        try { host.localStorage.setItem(KEY, JSON.stringify(evidence)); } catch (_) { panel.hidden = true; return; }
        panel.hidden = true; sync();
      });
    });
  }
  function start() {
    if (started) return; started = true;
    var style = doc.createElement('link'); style.rel = 'stylesheet'; style.href = '/sp/meta-privacy.css'; doc.head.appendChild(style);
    var settingsButton = doc.createElement('button'); settingsButton.id = 'sp-cookie-settings'; settingsButton.type = 'button'; settingsButton.textContent = 'Cookie settings'; settingsButton.addEventListener('click', settings); doc.body.appendChild(settingsButton);
    host.addEventListener('storage', function (e) { if (e.key === KEY) sync(); });
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 2000);
    host.fetch('/cdn-cgi/trace', { signal: controller.signal }).then(function (r) {
      if (!r.ok) throw new Error('Region unavailable'); return r.text();
    }).then(function (text) {
      var match = text.match(/^loc=([A-Z]{2})$/m);
      region = match && match[1] !== 'XX' && match[1] !== 'T1' ? match[1] : null;
    }).catch(function () { region = null; }).finally(function () {
      clearTimeout(timer); sync();
      if (!record() && (region === null || REGIONS.indexOf(region) !== -1)) settings();
    });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();