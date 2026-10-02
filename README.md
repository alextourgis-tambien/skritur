# Skritur — Webflow animations

Standalone animation files for https://skritur-preprod.webflow.io/.

## Installation

The repository must be publicly accessible for the jsDelivr URLs below. Publish
`assets/skritur.css` and `assets/skritur.js` on `main`, then copy the contents of
`webflow/header.html` into Webflow Site settings → Custom code → Head code, and
`webflow/footer.html` into Footer code. Save and publish the Webflow site.

The loader fetches GSAP 3.13.0, ScrollTrigger, SplitText and Lenis 1.3.11 only when
animations are enabled. Existing globals are reused. No npm build is needed.
Do not add a second Lenis initialization in Webflow.

## Behavior

- Light wheel smoothing: Lenis `lerp: 0.18`; native touch scrolling.
- Rolling text for `.nav_button`, `.nav__font--wrapper`, `.drop_button`,
  `.hh__block` → `.hh__text-link` and `.font__link` → `.text-block`.
- Subtle title lift for `.h-journal__collection-item-parent` → `.h-journal__title`.
- Footer rolling text, including standalone `.footer__link-text` and `.footer__link`.
- Scroll reveals on `.h-journal__title`, `.Paragraph`, `.paragraph`,
  `.font__listing`, `.thanks__name`. Real lines, with responsive re-splitting.
- Reveals run once; hidden language variants are prepared when visible.
- Keyboard focus also activates hovers. Decorative text copies are aria-hidden.
- `prefers-reduced-motion: reduce` disables this script's smoothing and animations.
- No global initial visibility rule: dependency failures leave content readable.
- Rich content with interactive descendants is preserved and excluded from splitting.

`window.SkriturAnimations.refresh()` rebuilds after externally inserted CMS content.
`window.SkriturAnimations.destroy()` restores the original DOM and releases listeners.
Add `data-lenis-prevent` to independently scrollable modal/list containers.

## Updates

jsDelivr caches branch URLs. Changes to `@main` can take time to reach visitors.
For an exact release, use the same commit SHA in both snippet URLs instead of
`main`; change those two URLs when publishing a new release.

## Validation

JavaScript syntax checked with `node --check assets/skritur.js`.
Browser checks on a local copy of the actual preproduction HTML plus fixtures:
Lenis configuration, all rolling targets, focus and exit, multiline reveals,
hidden language activation, repeat initialization, restoration on destroy,
and reduced-motion mode. Live Webflow validation is required after installation.
