/* Easy Plans DB funnel script.
   Keeps ad click IDs and UTMs for the session, passes them to the GHL form,
   runs the FAQ accordion and the sticky call dock. No libraries. */
(function () {
  'use strict';

  var ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ttclid', 'msclkid'];
  var STORE = 'epd_attribution';
  var FORM_ID = 'inline-GCCiI643XnxeJONz8Suz';

  /* ---- Attribution: read from the URL, merge with what this session already has ---- */
  function readStore() {
    try { return JSON.parse(sessionStorage.getItem(STORE)) || {}; } catch (e) { return {}; }
  }

  function writeStore(data) {
    try { sessionStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { /* private mode: carry on without it */ }
  }

  var attribution = readStore();
  var query = new URLSearchParams(window.location.search);
  ATTR_KEYS.forEach(function (key) {
    var value = query.get(key);
    if (value) attribution[key] = value;
  });
  writeStore(attribution);

  function withAttribution(url) {
    var keys = Object.keys(attribution);
    if (!keys.length) return url;
    var target = new URL(url, window.location.href);
    keys.forEach(function (key) {
      if (!target.searchParams.has(key)) target.searchParams.set(key, attribution[key]);
    });
    return target.toString();
  }

  // Internal links (thank-you, privacy, terms) keep the same UTMs
  document.querySelectorAll('a[data-epd-carry]').forEach(function (link) {
    link.href = withAttribution(link.getAttribute('href'));
  });

  // Pass UTMs to the GHL form. GHL fills hidden fields whose names match the query keys.
  var formFrame = document.getElementById(FORM_ID);
  if (formFrame && Object.keys(attribution).length) {
    formFrame.src = withAttribution(formFrame.getAttribute('src'));
  }

  // Redirect helper, in case the form tool calls a JS redirect instead of GHL's own "Open URL" option
  window.EPD = window.EPD || {};
  window.EPD.attribution = attribution;
  window.EPD.goToThankYou = function () {
    window.location.href = withAttribution('thank-you.html');
  };

  /* ---- CTA buttons: scroll to the form ---- */
  var quote = document.getElementById('quote');
  document.querySelectorAll('[data-epd-cta]').forEach(function (btn) {
    btn.addEventListener('click', function (event) {
      if (!quote) return;
      event.preventDefault();
      quote.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#quote');
    });
  });

  /* ---- FAQ accordion ---- */
  document.querySelectorAll('.epd-faq__item button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      btn.setAttribute('aria-expanded', String(!open));
      if (panel) panel.hidden = open;
    });
  });

  /* ---- Sticky dock: show after the hero, hide while the form or final CTA is on screen ---- */
  var dock = document.querySelector('.epd-dock');
  var hero = document.querySelector('.epd-hero, .epd-ty');
  if (dock && hero && 'IntersectionObserver' in window) {
    var state = { heroVisible: true, blockers: 0 };
    var blockers = document.querySelectorAll('#quote, #final');

    var update = function () {
      var show = !state.heroVisible && state.blockers === 0;
      dock.classList.toggle('is-on', show);
      dock.setAttribute('aria-hidden', String(!show));
      dock.querySelectorAll('a').forEach(function (a) { a.tabIndex = show ? 0 : -1; });
    };

    new IntersectionObserver(function (entries) {
      state.heroVisible = entries[0].isIntersecting;
      update();
    }, { threshold: 0.05 }).observe(hero);

    var seen = new Map();
    var blockObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { seen.set(entry.target, entry.isIntersecting); });
      state.blockers = 0;
      seen.forEach(function (visible) { if (visible) state.blockers += 1; });
      update();
    }, { threshold: 0.15 });
    blockers.forEach(function (el) { blockObserver.observe(el); });
  }

  /* ---- Footer year ---- */
  document.querySelectorAll('[data-epd-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
