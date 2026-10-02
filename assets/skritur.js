/* Skritur Webflow animations. No build step. */
(() => {
  'use strict';
  if (window.SkriturAnimations) return;

  const CDN = 'https://cdn.jsdelivr.net/npm/';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hoverMedia = window.matchMedia('(hover: hover) and (pointer: fine)');
  const revealSelector = '.h-journal__title, .h-about__p, .Paragraph, .paragraph, .font__listing, .thanks__name';
  let cleanup = () => {};
  let loading;
  let destroyed = false;

  function loadScript(path, globalName) {
    if (window[globalName]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CDN + path;
      script.onload = () => window[globalName] ? resolve() : reject(new Error(globalName + ' unavailable'));
      script.onerror = () => reject(new Error('Failed to load ' + globalName));
      document.head.append(script);
    });
  }

  function dependencies() {
    if (!loading) loading = (async () => {
      await loadScript('gsap@3.13.0/dist/gsap.min.js', 'gsap');
      await Promise.all([
        loadScript('gsap@3.13.0/dist/ScrollTrigger.min.js', 'ScrollTrigger'),
        loadScript('gsap@3.13.0/dist/SplitText.min.js', 'SplitText'),
        loadScript('lenis@1.3.11/dist/lenis.min.js', 'Lenis'),
      ]);
    })().catch(error => { loading = null; throw error; });
    return loading;
  }

  function initialize() {
    cleanup();
    cleanup = () => {};
    if (destroyed || reducedMotion.matches) return;
    const { gsap, ScrollTrigger, SplitText, Lenis } = window;
    gsap.registerPlugin(ScrollTrigger, SplitText);
    const disposers = [];
    const splits = [];
    const tweens = new Set();
    const handled = new Set();
    const hovered = new Map();
    let lenis;
    let refreshFrame;
    const context = gsap.context(() => {});

    cleanup = () => {
      cancelAnimationFrame(refreshFrame);
      disposers.reverse().forEach(dispose => dispose());
      splits.forEach(split => split.revert());
      tweens.forEach(tween => tween.kill());
      context.revert();
      window.SkriturAnimations.lenis = null;
    };

    const scheduleRefresh = () => {
      cancelAnimationFrame(refreshFrame);
      refreshFrame = requestAnimationFrame(() => {
        lenis?.resize();
        ScrollTrigger.refresh();
      });
    };
    const listen = (element, event, callback) => {
      element.addEventListener(event, callback);
      disposers.push(() => element.removeEventListener(event, callback));
    };

    // Own only our instance, leaving any existing smooth-scroll setup intact.
    if (!window.lenis && !document.documentElement.classList.contains('lenis')) {
      lenis = new Lenis({
        lerp: 0.18,
        smoothWheel: true,
        syncTouch: false,
        autoRaf: true,
        anchors: false, // Webflow keeps ownership of anchor navigation.
        virtualScroll: () => !['hidden', 'clip'].includes(getComputedStyle(document.body).overflowY)
          && !['hidden', 'clip'].includes(getComputedStyle(document.documentElement).overflowY),
        prevent: node => Boolean(node.closest?.('[data-lenis-prevent], .w-nav-menu[data-nav-menu-open]')),
      });
      lenis.on('scroll', ScrollTrigger.update);
      disposers.push(() => lenis.destroy());
    }
    window.SkriturAnimations.lenis = lenis || null;

    function makeHover(host, target, lift = false) {
      if (handled.has(target) || !target.textContent.trim()) return;
      // Do not clone interactive content or rich block structures.
      if (!lift && target.querySelector('a, button, input, select, textarea, [contenteditable], div, p')) lift = true;
      handled.add(target);
      let animation;
      if (lift) {
        context.add(() => {
          animation = gsap.to(target, { y: -3, duration: 0.3, ease: 'power2.out', paused: true });
        });
      } else {
        const originalNodes = [...target.childNodes];
        const viewport = document.createElement('span');
        const original = document.createElement('span');
        viewport.className = 'skritur-roll';
        original.className = 'skritur-roll__original';
        original.append(...originalNodes);
        const copy = original.cloneNode(true);
        copy.className = 'skritur-roll__copy';
        copy.setAttribute('aria-hidden', 'true');
        copy.removeAttribute('id');
        copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        viewport.append(original, copy);
        target.append(viewport);
        context.add(() => {
          gsap.set(copy, { yPercent: 110 });
          animation = gsap.timeline({ paused: true })
            .to(original, { yPercent: -110, duration: 0.36, ease: 'power2.inOut' }, 0)
            .to(copy, { yPercent: 0, duration: 0.36, ease: 'power2.inOut' }, 0);
        });
        disposers.push(() => {
          target.append(...originalNodes);
          viewport.remove();
        });
      }
      tweens.add(animation);
      // Aggregate pointer and keyboard focus to avoid jumps when both are active.
      let pointer = false;
      let focus = false;
      const update = () => pointer || focus ? animation.play() : animation.reverse();
      listen(host, 'pointerenter', event => {
        if (hoverMedia.matches && event.pointerType !== 'touch') { pointer = true; update(); }
      });
      listen(host, 'pointerleave', () => { pointer = false; update(); });
      listen(host, 'focusin', () => { focus = true; update(); });
      listen(host, 'focusout', event => {
        if (!host.contains(event.relatedTarget)) { focus = false; update(); }
      });
      hovered.set(target, lift);
    }

    [
      ['.nav_button, .nav__font--wrapper, .drop_button, .hh__block', '.hh__text-link'],
      ['.font__link', '.text-block'],
      ['.h-journal__collection-item-parent', '.h-journal__title', true],
    ].forEach(([parent, child, lift]) => {
      document.querySelectorAll(parent).forEach(host => {
        host.querySelectorAll(child).forEach(target => makeHover(host, target, lift));
      });
    });
    document.querySelectorAll('.footer__link').forEach(host => {
      const targets = host.querySelectorAll('.footer__link-text, .text-block');
      if (targets.length) targets.forEach(target => makeHover(host, target));
      else makeHover(host, host);
    });
    document.querySelectorAll('.footer__link-text').forEach(target => makeHover(target, target));

    // Split text blocks rather than whole listings; preserve interactive descendants.
    const revealTargets = new Set();
    document.querySelectorAll(revealSelector).forEach(element => {
      const blocks = [...element.querySelectorAll('p, h1, h2, h3, h4, h5, h6, .text-block')];
      (blocks.length ? blocks.filter(block => !blocks.some(other => other !== block && block.contains(other))) : [element])
        .forEach(target => revealTargets.add(target));
    });
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || !entry.target.getClientRects().length) return;
        revealObserver.unobserve(entry.target);
        splitReveal(entry.target);
      });
    }, { rootMargin: '0px 0px 10% 0px' });
    disposers.push(() => revealObserver.disconnect());

    function splitReveal(target) {
        if (!target.textContent.trim() || target.querySelector('a, button, input, select, textarea, [contenteditable]')) return;
        if (hovered.has(target) && !hovered.get(target)) return;
        let revealed = false;
        const split = SplitText.create(target, {
          type: 'lines',
          mask: 'lines',
          linesClass: 'skritur-line',
          autoSplit: true,
          aria: 'none',
          onSplit(self) {
            if (revealed) { scheduleRefresh(); return; }
            // Hidden language variants wait until Webflow makes them visible.
            const animation = gsap.from(self.lines, {
              yPercent: 105,
              opacity: 0,
              duration: 0.7,
              stagger: 0.075,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: target,
                start: 'top 90%',
                once: true,
                onEnter: () => { revealed = true; },
              },
            });
            scheduleRefresh();
            return animation;
          },
        });
        splits.push(split);
    }
    [...revealTargets].filter(target => ![...revealTargets].some(other => other !== target && target.contains(other)))
      .forEach(target => revealObserver.observe(target));

    listen(window, 'load', scheduleRefresh);
    listen(window, 'pageshow', scheduleRefresh);
    // Language/dropdown changes can change layout and reveal a previously hidden title.
    listen(document, 'click', scheduleRefresh);
    scheduleRefresh();
  }

  async function refresh() {
    if (destroyed || reducedMotion.matches) { cleanup(); cleanup = () => {}; return; }
    try {
      await dependencies();
      if (document.fonts) await document.fonts.ready;
      initialize();
    } catch (error) {
      cleanup();
      cleanup = () => {};
      console.warn('[Skritur] Animations unavailable; content stays readable.', error);
    }
  }

  window.SkriturAnimations = {
    version: '1.0.1',
    lenis: null,
    refresh,
    destroy() {
      destroyed = true;
      cleanup();
      cleanup = () => {};
      reducedMotion.removeEventListener('change', refresh);
      document.removeEventListener('DOMContentLoaded', refresh);
      delete window.SkriturAnimations;
    },
  };
  reducedMotion.addEventListener('change', refresh);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh, { once: true });
  else refresh();
})();
