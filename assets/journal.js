/* Home journal carousel: one CMS article at a time, with looping navigation. */
(() => {
  'use strict';
  if (window.SkriturJournal) return;
  const disposers = [];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let destroyed = false;
  const style = document.createElement('style');
  style.textContent = `
    .skritur-journal .h-journal__collection-list { display: grid; }
    .skritur-journal .h-journal__collection-item {
      grid-area: 1 / 1; min-width: 0; width: 100%;
      visibility: hidden; pointer-events: none;
    }
    .skritur-journal .h-journal__collection-item.is-journal-active {
      visibility: visible; pointer-events: auto;
    }
    .skritur-journal .h-journal__arrow { cursor: pointer; }
    .skritur-journal .h-journal__arrow[aria-disabled="true"] { opacity: .35; cursor: default; }
    .skritur-journal .h-journal__arrow:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
    .skritur-journal-status {
      position: absolute; width: 1px; height: 1px; padding: 0;
      overflow: hidden; clip-path: inset(50%); white-space: nowrap;
    }
  `;
  document.head.append(style);

  function initialize() {
    if (destroyed) return;
    document.querySelectorAll('.h-journal__wrapper').forEach(root => {
      const list = root.querySelector('.h-journal__collection-list');
      if (!list) return;
      const items = [...list.children].filter(item => item.matches('.h-journal__collection-item'));
      const left = root.querySelector('.h-journal__arrow.is--left');
      const right = root.querySelector('.h-journal__arrow.is--right');
      if (!items.length || !left || !right) return;
      let index = 0;
      let busy = false;
      let animation;
      const nativeAnimations = new Set();
      const saved = new Map();
      const remember = (element, name) => {
        if (!saved.has(element)) saved.set(element, new Map());
        const attributes = saved.get(element);
        if (!attributes.has(name)) attributes.set(name, element.getAttribute(name));
      };
      const set = (element, name, value) => {
        remember(element, name);
        element.setAttribute(name, value);
      };
      const status = document.createElement('div');
      status.className = 'skritur-journal-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.setAttribute('aria-atomic', 'true');
      root.append(status);
      root.classList.add('skritur-journal');
      remember(list, 'style');
      items.forEach(item => { remember(item, 'inert'); remember(item, 'style'); });
      const show = next => {
        index = next;
        items.forEach((item, position) => {
          const active = position === index;
          item.classList.toggle('is-journal-active', active);
          set(item, 'aria-hidden', String(!active));
          if (active) item.removeAttribute('inert');
          else item.setAttribute('inert', '');
        });
      };
      const announce = () => {
        const title = [...items[index].querySelectorAll('.h-journal__title')]
          .find(element => getComputedStyle(element.parentElement).display !== 'none');
        status.textContent = `Article ${index + 1} sur ${items.length}${title ? ' : ' + title.textContent.trim() : ''}`;
        window.SkriturAnimations?.lenis?.resize();
        window.ScrollTrigger?.refresh();
      };
      const move = direction => {
        if (busy || items.length < 2 || destroyed) return;
        busy = true;
        const next = (index + direction + items.length) % items.length;
        const outgoing = items[index];
        const incoming = items[next];
        const properties = ['opacity', 'visibility', 'z-index'];
        const previousStyles = [outgoing, incoming].map(item => properties.map(name =>
          [name, item.style.getPropertyValue(name), item.style.getPropertyPriority(name)]));
        const restore = () => [outgoing, incoming].forEach((item, i) => previousStyles[i].forEach(([name, value, priority]) => {
          if (value) item.style.setProperty(name, value, priority);
          else item.style.removeProperty(name);
        }));
        const finish = () => { show(next); restore(); busy = false; announce(); };
        if (motion.matches) { show(next); finish(); return; }
        // Keep an opaque incoming article underneath: no flash of the white page.
        incoming.style.visibility = 'visible';
        incoming.style.opacity = '1';
        incoming.style.zIndex = '1';
        outgoing.style.zIndex = '2';
        outgoing.style.opacity = '1';
        if (window.gsap) {
          animation = window.gsap.to(outgoing, {
            opacity: 0, duration: .55, ease: 'sine.inOut', onComplete: finish,
          });
        } else {
          const tween = outgoing.animate([{opacity: 1}, {opacity: 0}], {
            duration: 550, easing: 'cubic-bezier(.37, 0, .63, 1)', fill: 'forwards',
          });
          nativeAnimations.add(tween);
          (async () => {
            await tween.finished;
            if (destroyed) return;
            finish();
            tween.cancel();
            nativeAnimations.delete(tween);
          })().catch(() => { busy = false; });
        }
      };
      show(0);
      [left, right].forEach((button, position) => {
        const direction = position === 0 ? -1 : 1;
        set(button, 'role', 'button');
        set(button, 'tabindex', items.length > 1 ? '0' : '-1');
        set(button, 'aria-label', position === 0 ? 'Article précédent' : 'Article suivant');
        set(button, 'aria-disabled', String(items.length < 2));
        const click = event => { event.preventDefault(); move(direction); };
        const keydown = event => {
          if (['Enter', ' ', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault();
            move(event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : direction);
          }
        };
        button.addEventListener('click', click);
        button.addEventListener('keydown', keydown);
        disposers.push(() => {
          button.removeEventListener('click', click);
          button.removeEventListener('keydown', keydown);
        });
      });
      disposers.push(() => {
        animation?.kill();
        nativeAnimations.forEach(tween => tween.cancel());
        root.classList.remove('skritur-journal');
        items.forEach(item => item.classList.remove('is-journal-active'));
        saved.forEach((attributes, element) => attributes.forEach((value, name) => {
          if (value === null) element.removeAttribute(name);
          else element.setAttribute(name, value);
        }));
        status.remove();
      });
    });
  }
  window.SkriturJournal = {
    destroy() {
      destroyed = true;
      document.removeEventListener('DOMContentLoaded', initialize);
      disposers.reverse().forEach(dispose => dispose());
      style.remove();
      delete window.SkriturJournal;
    },
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once: true});
  else initialize();
})();
