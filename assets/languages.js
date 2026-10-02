/* Local language controls for journal cards, team biographies and CMS articles. */
(() => {
  'use strict';
  if (window.SkriturLanguages) return;
  const selector = '.h-journal__title-wrapper, .team__content, .journal__description, .journal__title, .article__c-wrapper';
  const languages = ['fr', 'bz', 'en'];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const disposers = [];
  let destroyed = false;
  const languageOf = element => languages.find(language => element.classList.contains('is--' + language));
  // Some Webflow buttons have swapped EN/BZ classes: the visible label is authoritative.
  const buttonLanguage = button => {
    const label = button.textContent.trim().toLowerCase();
    return languages.includes(label) ? label : languageOf(button);
  };
  const style = document.createElement('style');
  style.textContent = `
    .language__block[data-skritur-language] { cursor: pointer; transition: opacity .2s ease; }
    .language__block[data-skritur-language][aria-pressed="false"] { opacity: .4; }
    .language__block[data-skritur-language][aria-pressed="true"] { opacity: 1; }
    .language__block[data-skritur-language]:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
    .language__block[data-skritur-language][aria-disabled="true"] { opacity: .2; cursor: default; }
    @media (prefers-reduced-motion: reduce) { .language__block[data-skritur-language] { transition: none; } }
  `;
  document.head.append(style);

  function initialize() {
    if (destroyed) return;
    document.querySelectorAll('.language__wrapper').forEach(group => {
      const buttons = [...group.querySelectorAll('.language__block')].filter(button => buttonLanguage(button));
      if (!buttons.length) return;
      let scope = group.parentElement;
      let variants = [];
      while (scope && !scope.matches('body, .main')) {
        const candidates = [...scope.querySelectorAll(selector)].filter(languageOf);
        variants = candidates.filter(element => !candidates.some(parent => parent !== element && parent.contains(element)));
        if (variants.length) break;
        scope = scope.parentElement;
      }
      if (!variants.length) return;
      const saved = new Map();
      const remember = (element, name) => {
        if (!saved.has(element)) saved.set(element, new Map());
        if (!saved.get(element).has(name)) saved.get(element).set(name, element.getAttribute(name));
      };
      const set = (element, name, value) => { remember(element, name); element.setAttribute(name, value); };
      const displays = new Map();
      variants.forEach(element => {
        remember(element, 'style');
        const display = getComputedStyle(element).display;
        const base = [...element.classList].find(name => name !== 'is--' + languageOf(element) && selector.includes('.' + name));
        const reference = variants.find(other => other.classList.contains(base) && languageOf(other) === 'fr');
        const referenceDisplay = reference ? getComputedStyle(reference).display : 'block';
        displays.set(element, display !== 'none' ? display : referenceDisplay !== 'none' ? referenceDisplay : 'block');
      });
      const available = language => variants.some(element => languageOf(element) === language
        && !element.classList.contains('w-condition-invisible') && element.textContent.trim());
      let current = available('fr') ? 'fr' : languages.find(available);
      if (!current) return;
      let busy = false;
      let timeline;
      const animations = new Set();
      const selected = language => variants.filter(element => languageOf(element) === language && !element.classList.contains('w-condition-invisible'));
      const show = language => {
        current = language;
        variants.forEach(element => {
          const visible = languageOf(element) === language && !element.classList.contains('w-condition-invisible');
          element.style.setProperty('display', visible ? displays.get(element) : 'none', 'important');
          set(element, 'aria-hidden', String(!visible));
          set(element, 'lang', languageOf(element) === 'bz' ? 'br' : languageOf(element));
        });
        buttons.forEach(button => set(button, 'aria-pressed', String(buttonLanguage(button) === language)));
      };
      const refreshLayout = () => requestAnimationFrame(() => {
        if (destroyed) return;
        window.SkriturAnimations?.lenis?.resize();
        window.ScrollTrigger?.refresh();
        scope.dispatchEvent(new CustomEvent('skritur:languagechange', {bubbles: true, detail: {language: current}}));
      });
      const nativeFade = async (elements, from, to, duration) => {
        const tweens = elements.map(element => {
          const animation = element.animate([{opacity: from}, {opacity: to}], {duration, easing: 'ease-out', fill: 'forwards'});
          animations.add(animation);
          return animation;
        });
        await Promise.all(tweens.map(animation => animation.finished));
        return tweens;
      };
      const change = language => {
        if (busy || language === current || !available(language) || destroyed) return;
        busy = true;
        const outgoing = selected(current);
        const incoming = selected(language);
        const prepareIncoming = () => scope.dispatchEvent(new CustomEvent('skritur:languageprepare', {
          bubbles: true, detail: {elements: incoming},
        }));
        const finish = () => { busy = false; refreshLayout(); };
        if (motion.matches) { show(language); finish(); return; }
        if (window.gsap) {
          window.gsap.set(incoming, {opacity: 0});
          timeline = window.gsap.timeline({onComplete: finish})
            .to(outgoing, {opacity: 0, duration: .15, ease: 'power1.out'})
            .call(() => { show(language); prepareIncoming(); refreshLayout(); })
            .fromTo(incoming, {opacity: 0}, {opacity: 1, duration: .28, ease: 'power2.out'});
        } else {
          (async () => {
            await nativeFade(outgoing, 1, 0, 150);
            if (destroyed) return;
            show(language);
            prepareIncoming();
            refreshLayout();
            await nativeFade(incoming, 0, 1, 280);
            animations.forEach(animation => animation.cancel());
            animations.clear();
            finish();
          })().catch(() => { busy = false; });
        }
      };
      buttons.forEach(button => {
        const language = buttonLanguage(button);
        set(button, 'data-skritur-language', language);
        set(button, 'role', 'button');
        set(button, 'tabindex', available(language) ? '0' : '-1');
        set(button, 'aria-disabled', String(!available(language)));
        set(button, 'aria-label', {fr: 'Français', bz: 'Breton', en: 'English'}[language]);
        const click = event => {
          event.preventDefault();
          event.stopPropagation();
          change(language);
        };
        const keydown = event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            change(language);
          }
        };
        button.addEventListener('click', click);
        button.addEventListener('keydown', keydown);
        disposers.push(() => {
          button.removeEventListener('click', click);
          button.removeEventListener('keydown', keydown);
        });
      });
      show(current);
      disposers.push(() => {
        timeline?.kill();
        animations.forEach(animation => animation.cancel());
        saved.forEach((attributes, element) => attributes.forEach((value, name) => {
          if (value === null) element.removeAttribute(name);
          else element.setAttribute(name, value);
        }));
      });
    });
  }
  window.SkriturLanguages = {
    destroy() {
      destroyed = true;
      document.removeEventListener('DOMContentLoaded', initialize);
      disposers.reverse().forEach(dispose => dispose());
      style.remove();
      delete window.SkriturLanguages;
    },
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once: true});
  else initialize();
})();
