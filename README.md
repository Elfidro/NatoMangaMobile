# NatoManga Mobile UI

A Tampermonkey userscript that rebuilds [natomanga.com](https://www.natomanga.com) as a phone-first reader: permanent dark mode, a slim header, a thumb-zone bottom nav, a per-manga blocklist, and infinite scroll.

Built for Tampermonkey on Android (Firefox / Kiwi), but it works in desktop browsers too — the mobile layout only applies below 820px, so wide screens keep the site's normal layout with dark mode still active.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (on Android, use Firefox or Kiwi Browser).
2. **[Click here to install the script](https://raw.githubusercontent.com/Elfidro/NatoMangaMobile/main/natomanga-mobile.user.js)** — Tampermonkey will intercept the `.user.js` URL and show its install page.
3. Confirm the install, then open natomanga.com.

Tampermonkey checks that same URL for updates, so pushing a new version here updates every install.

## What it does

### Always dark
Sets `localStorage.themeMode = 'dark'` at `document-start`, before the site's own inline theme script runs — so there's no white flash on load. A `MutationObserver` re-pins it if anything flips it back, and the site's theme toggle is hidden.

### Blocklist
Every card gets a ✕ in its top-right corner. Tap it and that manga disappears from every listing.

The list is stored with `GM_setValue`, which is Tampermonkey's own storage, not the site's — it survives clearing site data, and it isn't tied to your natomanga account. It does **not** sync between devices unless you turn on Tampermonkey's cloud sync (Dropbox / Google Drive / OneDrive) in its settings.

Menu → **Hidden manga** lists everything you've blocked, with an Unhide button for each.

### Infinite scroll
List, genre and search pages fetch the next page and append it as you approach the bottom, replacing the pager.

Blocked titles are filtered out *as pages are fetched*, and if an entire fetched page turns out to be blocked the script keeps fetching — so hiding a lot of series doesn't leave you with a short page.

The homepage has no pager (it's a fixed 56-card list), so its "VIEW MORE" button is left alone.

### Mobile layout
- Slim sticky top bar: logo + search only.
- Bottom nav: Home / Saved / History / Menu, with the bookmark count as a badge.
- Bottom sheet menu, built from the site's own nav so new sections appear automatically.
- The "Important Notice" banner, social buttons and ad slots are removed.
- The popular carousel becomes a native CSS scroll-snap strip — finger-swipe, no arrow overlays.
- Listings become rounded cards with cover art and chapter chips.

## Notes

- Only the mobile layout is gated behind the 820px breakpoint. Dark mode applies at every width.
- The script also matches `*.manganato.com`, which uses the same page structure.
- Selectors track the site's current markup (`.itemupdate`, `.list-comic-item-wrap`, `.panel_page_number`). If natomanga redesigns, the layout rules are the first thing that will need updating.
