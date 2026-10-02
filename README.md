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

## Homepage journal carousel

`assets/journal.js` uses `.h-journal__wrapper`, `.h-journal__collection-list`,
and `.h-journal__collection-item` with `.h-journal__arrow.is--left` / `.is--right`.
Disable **Limit items** and pagination on this CMS Collection List in Webflow:
all loaded articles participate, with one visible article and looping navigation.
GSAP dissolves the outgoing article over the incoming one in 850ms with sine easing,
keeping the image filled throughout the transition; reduced motion switches immediately. Enter, Space,
and left/right arrow keys work on the controls. Inactive articles are inert and
hidden from assistive technology. With only one article, controls are disabled.

## Support categories

`assets/support.js` creates one `.question__cat` per `.support__title-link`,
within each `.support__header` language variant. Questions retain their original
Webflow dropdown nodes and are grouped by the CMS category slug. Empty categories
show a short message. Category links support click, Enter and Space, with Lenis
scrolling and a 90px header offset (native scrolling when Lenis is unavailable).

In Webflow, bind `data-support-category` on the category link template to the
Support Categories **Slug**, and on the question item template to Supports
**Category → Slug**. Keep all categories and questions loaded: no item limit or
pagination. Publishing CMS additions or category changes updates the groups
automatically; no question/category mapping is hardcoded in JavaScript.

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
