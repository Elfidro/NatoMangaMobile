// ==UserScript==
// @name         NatoManga - Mobile UI (always dark)
// @namespace    luigi.natomanga
// @version      1.3.0
// @description  Slim sticky header, forced dark mode, bottom thumb-zone nav, native swipe carousel, cleaner cards, per-manga blocklist, infinite scroll.
// @author       Elfidro
// @homepageURL  https://github.com/Elfidro/NatoMangaMobile
// @supportURL   https://github.com/Elfidro/NatoMangaMobile/issues
// @downloadURL  https://raw.githubusercontent.com/Elfidro/NatoMangaMobile/main/natomanga-mobile.user.js
// @updateURL    https://raw.githubusercontent.com/Elfidro/NatoMangaMobile/main/natomanga-mobile.user.js
// @match        *://natomanga.com/*
// @match        *://www.natomanga.com/*
// @match        *://*.manganato.com/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  /* ===============================================================
   * 0. STORAGE SHIM
   * GM_* storage is Tampermonkey's own, so it survives clearing the
   * site's data. Falls back to localStorage if the grants are missing.
   * ============================================================= */
  var store = {
    get: function (k, d) {
      try {
        if (typeof GM_getValue === 'function') return GM_getValue(k, d);
        var raw = localStorage.getItem('nm_' + k);
        return raw == null ? d : JSON.parse(raw);
      } catch (e) { return d; }
    },
    set: function (k, v) {
      try {
        if (typeof GM_setValue === 'function') { GM_setValue(k, v); return; }
        localStorage.setItem('nm_' + k, JSON.stringify(v));
      } catch (e) {}
    }
  };

  // Blocked manga, keyed by slug: { slug: "Title shown in the manage list" }
  var blocked = store.get('blocked', {});
  if (typeof blocked !== 'object' || blocked === null) blocked = {};

  function saveBlocked() { store.set('blocked', blocked); }

  function slugOf(href) {
    var m = /\/manga\/([^/?#]+)/.exec(href || '');
    return m ? m[1] : null;
  }

  /* ===============================================================
   * 1. FORCE DARK MODE
   * The site keeps the theme in localStorage.themeMode, and an inline
   * script at the top of <body> does body.classList.add(themeMode).
   * dark = body.dark, light = no class. Setting the key at
   * document-start means the site paints dark on first frame - no
   * white flash - and the observer re-pins it if anything flips it.
   * ============================================================= */
  try { localStorage.setItem('themeMode', 'dark'); } catch (e) {}

  function pinDark() {
    var b = document.body;
    if (!b) return;
    if (!b.classList.contains('dark')) b.classList.add('dark');
    b.classList.remove('light');
  }

  // Watch ONLY the body's class attribute. Observing the whole tree fires
  // this callback for every node inserted while the page parses - thousands
  // of synchronous localStorage reads, which stalls load badly on a phone.
  var themeObserver = new MutationObserver(pinDark);

  function watchTheme() {
    if (!document.body) return false;
    pinDark();
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return true;
  }

  if (!watchTheme()) {
    // <body> does not exist yet at document-start. A childList watch on
    // documentElement alone (no subtree) is a couple of mutations, not thousands.
    var bodyWatcher = new MutationObserver(function () {
      if (watchTheme()) bodyWatcher.disconnect();
    });
    bodyWatcher.observe(document.documentElement, { childList: true });
  }

  /* ===============================================================
   * 2. STYLES
   * ============================================================= */
  function addStyle(css) {
    if (typeof GM_addStyle === 'function') { GM_addStyle(css); return; }
    var s = document.createElement('style');
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  addStyle([
    ':root{',
    '  --nm-bg:#0f0f11; --nm-surface:#1a1a1e; --nm-surface-2:#26262c;',
    '  --nm-line:rgba(255,255,255,.07); --nm-text:#e8e8ec; --nm-muted:#9b9ba4;',
    '  --nm-chip:#8fc3ff; --nm-accent:#ff6a3d; --nm-nav-h:56px;',
    '  --nm-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;',
    '}',

    /* ---- dark everywhere, no theme flip ---- */
    'html,body,body.dark{background:var(--nm-bg)!important;color:var(--nm-text)!important;}',
    'body{font-family:var(--nm-font)!important;font-size:14px!important;}',
    '.theme-mode-button{display:none!important;}',

    /* ---- blocked cards, hidden at any width ----
       Compound selectors are load-bearing: the card rules further down set
       display with !important at the same specificity and come later in the
       sheet, so a bare .nm-blocked would lose on source order. */
    '.nm-blocked,.itemupdate.nm-blocked,.list-comic-item-wrap.nm-blocked{display:none!important;}',

    '@media (max-width:820px){',

    /* ---- the site is content-box throughout, so every element we add
       padding to would otherwise overflow the viewport ---- */
    '  header,header *,.container,.slide,.slide *,#contentstory,#contentstory *,',
    '  .comic-list,.comic-list *,.xem-nhieu,.xem-nhieu *,#loadpage,#loadpage *,',
    '  .footer-content,.footer-content *,.history-container,.history-container *,',
    '  .panel-category,.panel-category *,#nm-nav,#nm-nav *,#nm-sheet,#nm-sheet *,',
    '  #nm-blocklist,#nm-blocklist *{box-sizing:border-box!important;}',

    /* ---- kill the bloat ---- */
    '  .notification-header, .link-social-desktop, #member .link-social, .mobile-menu,',
    '  header nav.wrap-menu-primary, .notification-popup, .footer-content .text-link,',
    '  [data-zone]{display:none!important;}',

    /* ---- slim sticky top bar ---- */
    '  header{position:sticky!important;top:0;z-index:9000;background:rgba(15,15,17,.94)!important;',
    '    -webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid var(--nm-line);}',
    '  header .container-top{display:flex!important;align-items:center;gap:10px;width:auto!important;',
    '    max-width:none!important;padding:7px 10px!important;margin:0!important;}',
    '  .top-logo{flex:0 0 auto;width:auto!important;height:auto!important;padding:0!important;',
    '    margin:0!important;background:none!important;text-align:left!important;}',
    '  .top-logo a{margin:0!important;padding:0!important;}',
    '  .top-logo img{height:26px!important;width:auto!important;margin:0!important;}',
    '  .top-header{flex:1 1 auto;min-width:0;display:block!important;padding:0!important;',
    '    margin:0!important;float:none!important;width:auto!important;}',
    '  .searching{width:100%!important;margin:0!important;padding:0!important;float:none!important;}',
    '  .searching form{margin:0!important;}',
    '  .searchi{width:100%!important;height:36px!important;box-sizing:border-box!important;',
    '    border-radius:18px!important;border:1px solid var(--nm-line)!important;',
    '    background:var(--nm-surface-2)!important;color:var(--nm-text)!important;',
    '    padding:0 14px!important;font-size:14px!important;}',
    '  #search_result{z-index:9500!important;border-radius:12px!important;overflow:hidden;',
    '    background:var(--nm-surface)!important;border:1px solid var(--nm-line)!important;}',
    '  .user-options{display:none!important;}',

    /* ---- section headings ----
       The site paints these with a grey slab from more specific rules, so
       the transparent override has to out-specify them. */
    '  .title,.update-title,.all-title,.update-slide,.panel-category-title,.history-title-bold{',
    '    background:transparent!important;color:var(--nm-text)!important;border:0!important;',
    '    font:600 12px/1 var(--nm-font)!important;letter-spacing:.09em;text-transform:uppercase;',
    '    padding:16px 12px 8px!important;margin:0!important;}',
    '  .leftCol .daily-update .title,.daily-update .update-title,.xem-nhieu .all-title,',
    '  #history-sidebar .history-title,.panel-category .panel-category-title{',
    '    background:transparent!important;background-image:none!important;width:auto!important;}',
    '  #history-sidebar-header,.history-sidebar-header{background:transparent!important;}',
    /* .daily-update floats and its title is absolutely positioned, which
       collapses the row to 3px and drops the heading behind the cards. */
    '  .daily-update{float:none!important;position:static!important;height:auto!important;',
    '    background:transparent!important;background-image:none!important;padding-top:0!important;}',
    '  .daily-update .title,.leftCol .daily-update .title{position:static!important;width:auto!important;}',
    '  .history-sidebar-header{padding:0 12px!important;align-items:baseline;}',
    '  .history-title-viewmore{color:var(--nm-muted)!important;font-size:11px!important;',
    '    text-transform:uppercase;letter-spacing:.06em;}',

    /* ---- carousel: native scroll-snap, no arrow overlays ----
       Owl keeps writing transform/left/width inline, so !important
       is doing real work here - do not drop it. */
    '  .slide{background:transparent!important;}',
    '  .popular-carousel-wrap{padding:0!important;}',
    '  #owl-demo .owl-wrapper-outer{overflow-x:auto!important;overflow-y:hidden!important;width:auto!important;',
    '    scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;}',
    '  #owl-demo .owl-wrapper-outer::-webkit-scrollbar{display:none;}',
    '  #owl-demo .owl-wrapper{display:flex!important;gap:10px;padding:0 12px!important;',
    '    width:max-content!important;transform:none!important;left:0!important;transition:none!important;}',
    '  #owl-demo .owl-item{flex:0 0 auto;float:none!important;width:44vw!important;max-width:190px;',
    '    scroll-snap-align:start;}',
    '  #owl-demo .owl-item .item{position:relative;border-radius:14px;overflow:hidden;display:block;}',
    '  #owl-demo .owl-item img{display:block;width:100%!important;height:auto!important;',
    '    border:0!important;border-radius:14px!important;}',
    '  #owl-demo .owl-controls{display:none!important;}',
    '  .slide-caption{position:absolute!important;left:0;right:0;bottom:0;padding:24px 9px 9px!important;',
    '    background:linear-gradient(transparent,rgba(0,0,0,.88))!important;}',
    '  .slide-caption h3{margin:0 0 3px!important;}',
    '  .slide-caption h3 a{color:#fff!important;font:600 12px/1.3 var(--nm-font)!important;',
    '    display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
    '  .slide-caption > a{color:rgba(255,255,255,.72)!important;font-size:11px!important;}',

    /* ---- latest release cards ----
       flex-direction needs !important: the site's own .doreamon rule wins
       otherwise and lays all 56 cards out in a single clipped row. */
    '  #contentstory .doreamon{display:flex!important;flex-direction:column!important;',
    '    flex-wrap:nowrap!important;align-items:stretch!important;gap:8px!important;padding:0 10px!important;}',
    '  .itemupdate{position:relative;display:flex!important;gap:11px;align-items:flex-start;',
    '    float:none!important;width:auto!important;height:auto!important;margin:0!important;',
    '    min-width:0!important;max-width:100%!important;flex:0 0 auto!important;',
    '    padding:10px!important;border:1px solid var(--nm-line)!important;border-radius:14px!important;',
    '    background:var(--nm-surface)!important;box-shadow:0 2px 10px rgba(0,0,0,.35);}',
    '  .itemupdate .cover{flex:0 0 74px;display:block;width:74px!important;height:100px!important;',
    '    padding:0!important;margin:0!important;border:0!important;border-radius:10px;overflow:hidden;}',
    '  .itemupdate .cover img{width:100%!important;height:100%!important;object-fit:cover;',
    '    border:0!important;border-radius:10px!important;}',
    /* min-width:0 at every level - flex items default to min-width:auto,
       which refuses to shrink below content and blows out the card. */
    '  .itemupdate ul{flex:1 1 auto;min-width:0!important;display:flex;flex-direction:column;gap:6px;',
    '    margin:0!important;padding:0 22px 0 0!important;list-style:none!important;}',
    '  .itemupdate ul li{display:flex!important;align-items:center;gap:8px;margin:0!important;',
    '    min-width:0!important;padding:0!important;border:0!important;list-style:none!important;}',
    '  .itemupdate ul li span{min-width:0!important;flex:0 1 auto!important;',
    '    overflow:hidden!important;text-overflow:ellipsis;}',
    '  .itemupdate h3{margin:0!important;padding:0!important;}',
    '  .itemupdate h3 a{color:var(--nm-text)!important;font:600 14px/1.3 var(--nm-font)!important;',
    '    display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
    '  .itemupdate .sts{display:inline-block;white-space:nowrap;background:var(--nm-surface-2)!important;',
    '    color:var(--nm-chip)!important;padding:3px 10px!important;border-radius:999px!important;',
    '    font:500 12px/1.25 var(--nm-font)!important;}',
    '  .itemupdate i{margin-left:auto;color:var(--nm-muted)!important;font-style:normal!important;',
    '    font-size:11px!important;white-space:nowrap;}',

    /* ---- per-card block button ---- */
    '  .nm-hide-btn{position:absolute;top:4px;right:2px;width:30px;height:30px;display:flex;',
    '    align-items:center;justify-content:center;background:none;border:0;padding:0;margin:0;',
    '    color:var(--nm-muted);font:400 17px/1 var(--nm-font);-webkit-tap-highlight-color:transparent;}',
    '  .nm-hide-btn:active{color:var(--nm-accent);}',

    /* ---- list / genre / search page cards ---- */
    '  .comic-list{padding:0 10px!important;display:flex!important;flex-direction:column!important;',
    '    gap:8px!important;}',
    '  .list-comic-item-wrap{position:relative;display:grid!important;',
    '    grid-template-columns:74px 1fr;grid-template-rows:auto auto auto;',
    '    column-gap:11px;row-gap:5px;align-content:start;',
    '    float:none!important;width:auto!important;height:auto!important;margin:0!important;',
    '    min-width:0!important;max-width:100%!important;',
    '    padding:10px!important;border:1px solid var(--nm-line)!important;border-radius:14px!important;',
    '    background:var(--nm-surface)!important;box-shadow:0 2px 10px rgba(0,0,0,.35);}',
    '  .list-comic-item-wrap .cover{grid-column:1;grid-row:1/4;display:block;',
    '    width:74px!important;height:100px!important;border-radius:10px;overflow:hidden;',
    '    padding:0!important;margin:0!important;border:0!important;}',
    '  .list-comic-item-wrap .cover img{width:100%!important;height:100%!important;object-fit:cover;',
    '    border:0!important;border-radius:10px!important;}',
    '  .list-comic-item-wrap h3{grid-column:2;grid-row:1;margin:0!important;padding-right:22px;}',
    '  .list-comic-item-wrap h3 a{color:var(--nm-text)!important;font:600 14px/1.3 var(--nm-font)!important;',
    '    display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
    '  .list-comic-item-wrap .list-story-item-wrap-chapter{grid-column:2;grid-row:2;justify-self:start;',
    '    display:inline-block;white-space:nowrap;background:var(--nm-surface-2)!important;',
    '    color:var(--nm-chip)!important;padding:3px 10px!important;border-radius:999px!important;',
    '    font:500 12px/1.25 var(--nm-font)!important;text-decoration:none;}',
    '  .list-comic-item-wrap > div{grid-column:2;grid-row:3;}',
    '  .list-comic-item-wrap .aye_icon{color:var(--nm-muted)!important;font-size:11px!important;}',
    /* the long synopsis and its <br> spacers are desktop filler */
    '  .list-comic-item-wrap > p,.list-comic-item-wrap > br{display:none!important;}',

    /* ---- popular list / genres ---- */
    '  .xem-nhieu-item{border:0!important;border-bottom:1px solid var(--nm-line)!important;padding:9px 12px!important;}',
    '  .xem-nhieu-item h3{margin:0!important;}',
    '  .xem-nhieu-item a{color:var(--nm-text)!important;font:400 13px/1.35 var(--nm-font)!important;}',
    '  .panel-category table a{color:var(--nm-muted)!important;}',

    /* ---- view-more button + infinite scroll status ---- */
    '  #loadpage{padding:14px 10px 0!important;}',
    '  #loadpage .xem-them{display:block!important;text-align:center;background:var(--nm-surface-2)!important;',
    '    color:var(--nm-text)!important;border-radius:12px!important;padding:13px!important;',
    '    font:600 13px/1 var(--nm-font)!important;letter-spacing:.06em;}',
    '  #nm-sentinel{height:1px;}',
    '  #nm-status{padding:16px 12px 4px;text-align:center;color:var(--nm-muted);font-size:12px;}',

    /* ---- footer + room for the bottom nav ---- */
    '  footer{margin-top:20px!important;}',
    '  .footer-content{padding:14px 12px!important;font-size:11px!important;color:var(--nm-muted)!important;}',
    '  body{padding-bottom:calc(var(--nm-nav-h) + env(safe-area-inset-bottom,0px) + 14px)!important;}',
    '  #top{bottom:calc(var(--nm-nav-h) + env(safe-area-inset-bottom,0px) + 14px)!important;z-index:8000!important;}',

    /* ---- bottom nav ---- */
    '  #nm-nav{position:fixed;left:0;right:0;bottom:0;z-index:9800;',
    '    height:calc(var(--nm-nav-h) + env(safe-area-inset-bottom,0px));',
    '    padding-bottom:env(safe-area-inset-bottom,0px);display:flex;align-items:stretch;',
    '    background:rgba(20,20,23,.96);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);',
    '    border-top:1px solid var(--nm-line);}',
    '  #nm-nav .nm-item{flex:1 1 0;display:flex;flex-direction:column;align-items:center;justify-content:center;',
    '    gap:3px;position:relative;background:none;border:0;padding:0;margin:0;',
    '    -webkit-tap-highlight-color:transparent;color:var(--nm-muted);text-decoration:none;',
    '    font:500 10px/1 var(--nm-font);letter-spacing:.02em;}',
    '  #nm-nav .nm-item svg{width:21px;height:21px;stroke:currentColor;fill:none;stroke-width:1.7;',
    '    stroke-linecap:round;stroke-linejoin:round;}',
    '  #nm-nav .nm-item:active,#nm-nav .nm-item.is-active{color:var(--nm-accent);}',
    '  #nm-nav .nm-badge{position:absolute;top:5px;left:calc(50% + 6px);min-width:16px;height:16px;',
    '    padding:0 4px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;',
    '    background:var(--nm-accent);color:#fff;border-radius:999px;font:600 9px/1 var(--nm-font);',
    '    font-style:normal;}',

    /* ---- menu sheet ---- */
    '  #nm-sheet{position:fixed;inset:0;z-index:9900;display:none;}',
    '  #nm-sheet.is-open{display:block;}',
    '  #nm-sheet .nm-scrim{position:absolute;inset:0;background:rgba(0,0,0,.55);',
    '    -webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);}',
    '  #nm-sheet .nm-panel{position:absolute;left:0;right:0;bottom:0;max-height:78vh;overflow-y:auto;',
    '    padding:8px 14px calc(20px + env(safe-area-inset-bottom,0px));background:var(--nm-surface);',
    '    border-top:1px solid var(--nm-line);border-radius:20px 20px 0 0;',
    '    transform:translateY(100%);transition:transform .22s ease;}',
    '  #nm-sheet.is-open .nm-panel{transform:translateY(0);}',
    '  #nm-sheet .nm-grip{width:38px;height:4px;border-radius:2px;background:rgba(255,255,255,.22);',
    '    margin:6px auto 12px;}',
    '  #nm-sheet .nm-who{display:flex;align-items:center;gap:10px;padding:6px 4px 14px;',
    '    border-bottom:1px solid var(--nm-line);margin-bottom:10px;color:var(--nm-text);text-decoration:none;}',
    '  #nm-sheet .nm-who img{width:34px;height:34px;border-radius:50%;object-fit:cover;}',
    '  #nm-sheet .nm-who span{font:600 14px/1 var(--nm-font);}',
    '  #nm-sheet .nm-links{display:grid;grid-template-columns:1fr 1fr;gap:8px;}',
    '  #nm-sheet .nm-links a,#nm-sheet .nm-links button{display:block;width:100%;text-align:left;',
    '    padding:13px 12px;border:0;border-radius:12px;background:var(--nm-surface-2);',
    '    color:var(--nm-text);text-decoration:none;font:500 12px/1.2 var(--nm-font);letter-spacing:.03em;}',
    '  #nm-sheet .nm-links .nm-danger{color:#ff7d7d;}',

    /* ---- blocklist manager ---- */
    '  #nm-blocklist{position:fixed;inset:0;z-index:9950;display:none;background:var(--nm-bg);',
    '    overflow-y:auto;padding-bottom:calc(20px + env(safe-area-inset-bottom,0px));}',
    '  #nm-blocklist.is-open{display:block;}',
    '  #nm-blocklist header{display:flex;align-items:center;gap:10px;padding:12px 14px;',
    '    border-bottom:1px solid var(--nm-line);position:sticky;top:0;background:var(--nm-bg);}',
    '  #nm-blocklist h2{margin:0;font:600 14px/1 var(--nm-font);flex:1;}',
    '  #nm-blocklist .nm-close{background:none;border:0;color:var(--nm-muted);font-size:15px;padding:6px 4px;}',
    '  #nm-blocklist ul{list-style:none;margin:0;padding:8px 14px;display:flex;flex-direction:column;gap:8px;}',
    '  #nm-blocklist li{display:flex;align-items:center;gap:10px;background:var(--nm-surface);',
    '    border:1px solid var(--nm-line);border-radius:12px;padding:11px 12px;}',
    '  #nm-blocklist li span{flex:1;min-width:0;font:500 13px/1.3 var(--nm-font);overflow:hidden;',
    '    text-overflow:ellipsis;white-space:nowrap;}',
    '  #nm-blocklist li button{background:var(--nm-surface-2);border:0;border-radius:999px;',
    '    color:var(--nm-chip);padding:6px 12px;font:600 11px/1 var(--nm-font);}',
    '  #nm-blocklist .nm-empty{padding:40px 20px;text-align:center;color:var(--nm-muted);font-size:13px;}',
    '}',

    '@media (min-width:821px){#nm-nav,#nm-sheet,#nm-blocklist,.nm-hide-btn{display:none!important;}}'
  ].join('\n'));

  /* ===============================================================
   * 3. BLOCKLIST - hide cards, add a per-card hide button
   * Cards are plain server-rendered .itemupdate blocks, identified by
   * the /manga/<slug> in their cover link.
   * ============================================================= */
  // Homepage cards are .itemupdate inside #contentstory .doreamon.
  // List / genre / search pages use .list-comic-item-wrap inside .comic-list.
  // Both carry a /manga/<slug> cover link, which is the block key.
  var CARD_SELECTOR = '.itemupdate, .list-comic-item-wrap';

  function cardInfo(card) {
    var link = card.querySelector('a[href*="/manga/"]');
    if (!link) return null;
    var slug = slugOf(link.getAttribute('href'));
    if (!slug) return null;
    var titleEl = card.querySelector('h3 a, h3, .item-title');
    var title = (titleEl ? titleEl.textContent : link.getAttribute('title') || slug).trim();
    return { slug: slug, title: title };
  }

  // Returns how many cards were hidden this pass.
  function applyBlocklist(root) {
    var hidden = 0;
    var cards = (root || document).querySelectorAll(CARD_SELECTOR);
    Array.prototype.forEach.call(cards, function (card) {
      var info = cardInfo(card);
      if (!info) return;
      card.setAttribute('data-nm-slug', info.slug);

      if (blocked[info.slug]) {
        card.classList.add('nm-blocked');
        hidden++;
        return;
      }
      card.classList.remove('nm-blocked');

      if (!card.querySelector('.nm-hide-btn')) {
        var btn = document.createElement('button');
        btn.className = 'nm-hide-btn';
        btn.type = 'button';
        btn.textContent = '✕';
        btn.setAttribute('aria-label', 'Hide ' + info.title);
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          blocked[info.slug] = info.title;
          saveBlocked();
          card.classList.add('nm-blocked');
          renderBlocklist();
          // Keep the page as full as it was before the card vanished.
          maybeLoadMore();
        });
        card.appendChild(btn);
      }
    });
    return hidden;
  }

  function unblock(slug) {
    delete blocked[slug];
    saveBlocked();
    var card = document.querySelector('[data-nm-slug="' + slug + '"]');
    if (card) card.classList.remove('nm-blocked');
    applyBlocklist();
    renderBlocklist();
  }

  /* ===============================================================
   * 4. INFINITE SCROLL
   * Pages are server-rendered with normal pagination links, so we
   * fetch the next page, parse it, and move its cards across. Blocked
   * cards are filtered on the way in, which is what keeps a page
   * feeling "full" even when a lot is hidden.
   * ============================================================= */
  // Requests are deliberately paced. Firing pages back-to-back looks like
  // scraping and gets the IP served a Cloudflare challenge, which locks the
  // whole site - not just this script - until it ages out.
  var MIN_FETCH_GAP_MS = 1500;
  var MAX_EMPTY_STREAK = 3;

  var infinite = {
    container: null,
    anchor: null,   // new cards go in after this node
    nextUrl: null,
    loading: false,
    done: false,
    seen: {},
    lastFetchAt: 0,
    emptyStreak: 0, // consecutive fetches that yielded nothing visible
    timer: null
  };

  function pageParam(href) {
    try { return parseInt(new URL(href, location.origin).searchParams.get('page') || '0', 10) || 0; }
    catch (e) { return 0; }
  }

  // The pager has no "next" link - just First(1), a .page_select for the
  // current page, some neighbours, and Last(N). So: read current, read the
  // ceiling from .page_last, and bump ?page=.
  function findNextUrl(doc, fromUrl) {
    var pager = doc.querySelector('.panel_page_number .group_page');
    if (!pager) return null;

    var sel = pager.querySelector('.page_select');
    var current = sel ? parseInt(sel.textContent.trim(), 10) : 0;
    if (!current) current = pageParam(fromUrl) || 1;

    var lastLink = pager.querySelector('.page_last');
    var last = lastLink ? pageParam(lastLink.getAttribute('href')) : 0;
    if (!last) {
      Array.prototype.forEach.call(pager.querySelectorAll('a[href*="page="]'), function (a) {
        var p = pageParam(a.getAttribute('href'));
        if (p > last) last = p;
      });
    }
    if (last && current >= last) return null;

    try {
      var u = new URL(fromUrl, location.origin);
      u.searchParams.set('page', String(current + 1));
      return u.href;
    } catch (e) { return null; }
  }

  function setStatus(text) {
    var el = document.getElementById('nm-status');
    if (el) el.textContent = text || '';
  }

  function loadMore() {
    if (infinite.loading || infinite.done || !infinite.nextUrl || !infinite.container) return;

    // Pace requests. If we were called too soon, wait out the remainder
    // instead of dropping the request or firing it immediately.
    var since = Date.now() - infinite.lastFetchAt;
    if (since < MIN_FETCH_GAP_MS) {
      if (infinite.timer) return;
      infinite.timer = setTimeout(function () {
        infinite.timer = null;
        loadMore();
      }, MIN_FETCH_GAP_MS - since);
      return;
    }

    infinite.loading = true;
    infinite.lastFetchAt = Date.now();
    setStatus('Loading more…');

    fetch(infinite.nextUrl, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (html) {
        // If Cloudflare starts challenging, stop dead. Retrying is what
        // digs the hole deeper and gets the whole site locked out.
        if (/__cf_chl|challenge-platform|Just a moment/i.test(html)) {
          infinite.loading = false;
          infinite.done = true;
          setStatus('Paused — the site is asking for a security check. Reload the page.');
          return;
        }

        var doc = new DOMParser().parseFromString(html, 'text/html');
        var base = doc.createElement('base');
        base.href = infinite.nextUrl;
        doc.head.appendChild(base);

        var incoming = doc.querySelectorAll(CARD_SELECTOR);
        var added = 0;

        Array.prototype.forEach.call(incoming, function (card) {
          var info = cardInfo(card);
          if (!info || blocked[info.slug] || infinite.seen[info.slug]) return;
          infinite.seen[info.slug] = true;
          // The container also holds the breadcrumb and pager, so insert
          // after the last card rather than at the end of the container.
          var copy = document.importNode(card, true);
          infinite.anchor.parentNode.insertBefore(copy, infinite.anchor.nextSibling);
          infinite.anchor = copy;
          added++;
        });

        var from = infinite.nextUrl;
        infinite.nextUrl = findNextUrl(doc, from);
        infinite.loading = false;
        applyBlocklist(infinite.container);

        if (!infinite.nextUrl) {
          infinite.done = true;
          setStatus('That’s everything.');
          return;
        }

        setStatus('');

        // If a whole page was blocked, fetch one more so the user still
        // gets a screenful - but cap the chain. Without a cap this walks
        // the entire catalogue at speed and trips Cloudflare.
        if (added === 0) {
          infinite.emptyStreak++;
          if (infinite.emptyStreak < MAX_EMPTY_STREAK) {
            loadMore();
          } else {
            infinite.emptyStreak = 0;
            setStatus('Everything on the next few pages is hidden — scroll to keep looking.');
          }
        } else {
          infinite.emptyStreak = 0;
        }
      })
      .catch(function (err) {
        infinite.loading = false;
        setStatus('Could not load more – tap to retry.');
        var el = document.getElementById('nm-status');
        if (el) el.onclick = function () { el.onclick = null; loadMore(); };
        console.warn('[natomanga-mobile] load more failed:', err);
      });
  }

  // Load again if the page is too short to scroll (e.g. most cards blocked).
  function maybeLoadMore() {
    if (document.documentElement.scrollHeight <= window.innerHeight + 200) loadMore();
  }

  function initInfiniteScroll() {
    var cards = document.querySelectorAll(CARD_SELECTOR);
    if (!cards.length) return;

    infinite.nextUrl = findNextUrl(document, location.href);
    if (!infinite.nextUrl) return; // homepage has no pager - leave VIEW MORE alone

    infinite.container = cards[0].parentElement;
    infinite.anchor = cards[cards.length - 1];

    Array.prototype.forEach.call(cards, function (c) {
      var info = cardInfo(c);
      if (info) infinite.seen[info.slug] = true;
    });

    var status = document.createElement('div');
    status.id = 'nm-status';
    var sentinel = document.createElement('div');
    sentinel.id = 'nm-sentinel';
    infinite.container.appendChild(status);
    infinite.container.appendChild(sentinel);

    // Hide the now-redundant pager.
    ['.panel_page_number', '#loadpage'].forEach(function (s) {
      var el = document.querySelector(s);
      if (el) el.style.display = 'none';
    });

    new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) loadMore();
    }, { rootMargin: '600px 0px' }).observe(sentinel);

    maybeLoadMore();
  }

  /* ===============================================================
   * 5. BOTTOM NAV + SHEETS
   * ============================================================= */
  var ORIGIN = location.origin;

  var ICON = {
    home: '<path d="M3 10.2 12 3l9 7.2"/><path d="M5.5 9.4V20h13V9.4"/><path d="M9.8 20v-5.6h4.4V20"/>',
    saved: '<path d="M6.5 3.8h11a1 1 0 0 1 1 1V21l-6.5-4-6.5 4V4.8a1 1 0 0 1 1-1Z"/>',
    history: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2V12l3.2 2"/>',
    menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>'
  };

  function svg(paths) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths + '</svg>'; }

  function bookmarkCount() {
    var el = document.getElementById('bookmark-badge');
    var n = el && el.textContent.trim();
    if (!n) { try { n = localStorage.getItem('bookmarkBadgeCount'); } catch (e) {} }
    n = parseInt(n, 10);
    if (!n || n < 1) return '';
    return n > 999 ? '999+' : String(n);
  }

  function buildNav() {
    if (document.getElementById('nm-nav')) return;

    var path = location.pathname.replace(/\/+$/, '') || '/';
    var count = bookmarkCount();

    var nav = document.createElement('nav');
    nav.id = 'nm-nav';
    nav.innerHTML =
      '<a class="nm-item" data-path="/" href="' + ORIGIN + '/">' + svg(ICON.home) + '<span>Home</span></a>' +
      '<a class="nm-item" data-path="/bookmark" href="' + ORIGIN + '/bookmark">' + svg(ICON.saved) +
        (count ? '<em class="nm-badge">' + count + '</em>' : '') + '<span>Saved</span></a>' +
      '<a class="nm-item" data-path="/history" href="' + ORIGIN + '/history">' + svg(ICON.history) +
        '<span>History</span></a>' +
      '<button class="nm-item" id="nm-menu-btn" type="button">' + svg(ICON.menu) + '<span>Menu</span></button>';

    Array.prototype.forEach.call(nav.querySelectorAll('[data-path]'), function (a) {
      if (a.getAttribute('data-path') === path) a.classList.add('is-active');
    });

    document.body.appendChild(nav);
  }

  function buildSheet() {
    if (document.getElementById('nm-sheet')) return;

    // Reuse the site's own primary menu so new sections appear on their own.
    var links = Array.prototype.map.call(
      document.querySelectorAll('#menu-menu-top .menu-item > a'),
      function (a) { return '<a href="' + a.href + '">' + a.textContent.trim() + '</a>'; }
    );
    links.push('<button type="button" id="nm-open-blocklist">HIDDEN MANGA</button>');
    links.push('<a class="nm-danger" href="' + ORIGIN + '/logout">LOG OUT</a>');

    var avatar = document.querySelector('#member .profile-avatar img');
    var name = document.querySelector('#member .profile-name');
    var who = name
      ? '<a class="nm-who" href="' + ORIGIN + '/user">' +
          '<img src="' + (avatar ? avatar.src : '/images/no-avatar.jpg') + '" alt="">' +
          '<span>' + name.textContent.trim() + '</span></a>'
      : '';

    var sheet = document.createElement('div');
    sheet.id = 'nm-sheet';
    sheet.innerHTML =
      '<div class="nm-scrim"></div>' +
      '<div class="nm-panel"><div class="nm-grip"></div>' + who +
      '<div class="nm-links">' + links.join('') + '</div></div>';
    document.body.appendChild(sheet);

    var close = function () { sheet.classList.remove('is-open'); };
    sheet.querySelector('.nm-scrim').addEventListener('click', close);

    var btn = document.getElementById('nm-menu-btn');
    if (btn) btn.addEventListener('click', function () { sheet.classList.toggle('is-open'); });

    var openBl = document.getElementById('nm-open-blocklist');
    if (openBl) openBl.addEventListener('click', function () {
      close();
      renderBlocklist();
      document.getElementById('nm-blocklist').classList.add('is-open');
    });
  }

  function buildBlocklistPanel() {
    if (document.getElementById('nm-blocklist')) return;
    var panel = document.createElement('div');
    panel.id = 'nm-blocklist';
    panel.innerHTML =
      '<header><h2>Hidden manga</h2><button class="nm-close" type="button">Done</button></header>' +
      '<ul></ul>';
    document.body.appendChild(panel);
    panel.querySelector('.nm-close').addEventListener('click', function () {
      panel.classList.remove('is-open');
    });
  }

  function renderBlocklist() {
    var panel = document.getElementById('nm-blocklist');
    if (!panel) return;
    var ul = panel.querySelector('ul');
    var slugs = Object.keys(blocked).sort(function (a, b) {
      return String(blocked[a]).localeCompare(String(blocked[b]));
    });

    ul.innerHTML = '';
    if (!slugs.length) {
      ul.innerHTML = '<div class="nm-empty">Nothing hidden yet. Tap ✕ on a card to hide that manga.</div>';
      return;
    }
    slugs.forEach(function (slug) {
      var li = document.createElement('li');
      li.innerHTML = '<span></span><button type="button">Unhide</button>';
      li.querySelector('span').textContent = blocked[slug] || slug;
      li.querySelector('button').addEventListener('click', function () { unblock(slug); });
      ul.appendChild(li);
    });
  }

  /* ===============================================================
   * 6. BOOT
   * ============================================================= */
  // Cloudflare serves its "verify you are human" interstitial from this same
  // origin, so the script matches it too. Leave that page completely alone -
  // anything we do there risks wedging the check and locking the site out.
  function isChallengePage() {
    return !!(window._cf_chl_opt ||
      document.querySelector('script[src*="/cdn-cgi/challenge-platform/"]') ||
      document.getElementById('challenge-form'));
  }

  function init() {
    if (isChallengePage()) {
      console.info('[natomanga-mobile] challenge page - standing down');
      return;
    }
    pinDark();
    buildNav();
    buildSheet();
    buildBlocklistPanel();
    applyBlocklist();
    initInfiniteScroll();

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var s = document.getElementById('nm-sheet');
      var b = document.getElementById('nm-blocklist');
      if (s) s.classList.remove('is-open');
      if (b) b.classList.remove('is-open');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
