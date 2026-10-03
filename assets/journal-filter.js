/* Filter the Journal listing using its published nested CMS categories. */
(() => {
  'use strict';
  if (window.SkriturJournalFilter) return;
  const disposers = [];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const key = text => text.trim().normalize('NFKC').toLocaleLowerCase('fr');
  const style = document.createElement('style');
  style.textContent = `
    [data-journal-categories], .journal__collection-item[data-journal-filter-hidden] { display: none !important; }
    .filter__text-wrapper[data-journal-filter] { cursor: pointer; padding: .6em .8em; opacity: .6; }
    .filter__text-wrapper[data-journal-filter][aria-checked="true"] { opacity: 1; font-weight: 600; }
    .filter__text-wrapper[data-journal-filter]:hover { opacity: 1; }
    .filter__text-wrapper[data-journal-filter]:focus-visible { outline: 1px solid currentColor; outline-offset: -2px; }
    .skritur-journal-empty { padding: 2rem 0; opacity: .6; }
  `;

  function initialize() {
    document.querySelectorAll('.filter').forEach(dropdown => {
      const root = dropdown.closest('section');
      const list = root?.querySelector('.journal__collection-list');
      const menu = dropdown.querySelector('.filter__collection-list');
      const toggle = dropdown.querySelector('.filter__toggle');
      const label = toggle?.querySelector('.filter__text');
      const items = list ? [...list.children].filter(item => item.matches('.journal__collection-item')) : [];
      if (!menu || !toggle || !label || !items.length) return;
      // Do not activate a filter until every card has its CMS category source.
      if (items.some(item => !item.querySelector('[data-journal-categories]'))) return;
      const categories = new Map(items.map(item => [item, new Set(
        [...item.querySelectorAll('[data-journal-category]')].map(node => key(node.textContent)),
      )]));
      const originalLabel = label.textContent;
      const allItem = document.createElement('div');
      allItem.className = 'filter__collection-item';
      const allButton = document.createElement('div');
      allButton.className = 'filter__text-wrapper';
      allButton.textContent = 'Tous les articles';
      allItem.append(allButton);
      menu.prepend(allItem);
      const options = [...menu.querySelectorAll('.filter__text-wrapper')];
      const empty = document.createElement('p');
      empty.className = 'skritur-journal-empty';
      empty.textContent = 'Aucun article dans cette catégorie pour le moment.';
      empty.hidden = true;
      list.after(empty);
      const status = document.createElement('span');
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      Object.assign(status.style, {position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clipPath: 'inset(50%)'});
      list.after(status);
      let current = '';
      let tween;
      let revision = 0;
      const refresh = () => {
        window.SkriturAnimations?.requestLayoutRefresh?.();
      };
      const apply = (category, title) => {
        let count = 0;
        items.forEach(item => {
          const visible = !category || categories.get(item).has(category);
          item.toggleAttribute('data-journal-filter-hidden', !visible);
          if (visible) count++;
        });
        empty.hidden = count !== 0;
        label.textContent = category ? title : originalLabel;
        options.forEach(button => button.setAttribute('aria-checked', String(button.dataset.journalFilter === category)));
        status.textContent = `${count} article${count === 1 ? '' : 's'}`;
        refresh();
      };
      const close = () => {
        // Webflow listens to mouseup on desktop, so a synthetic toggle click
        // does not reliably close it. Its close event is idempotent.
        if (window.jQuery) window.jQuery(dropdown).triggerHandler('w-close.w-dropdown');
        else if (toggle.getAttribute('aria-expanded') === 'true') toggle.click();
        toggle.focus({preventScroll: true});
      };
      const choose = button => {
        const category = button.dataset.journalFilter;
        close();
        if (current === category) return;
        current = category;
        const version = ++revision;
        tween?.kill();
        if (motion.matches || !window.gsap) {
          apply(category, button.textContent.trim());
          if (window.gsap) window.gsap.set(list, {clearProps: 'opacity'});
          return;
        }
        tween = window.gsap.timeline()
          .to(list, {opacity: 0, duration: .12, ease: 'power1.out'})
          .call(() => { if (version === revision) apply(category, button.textContent.trim()); })
          .to(list, {opacity: 1, duration: .24, ease: 'power2.out', clearProps: 'opacity'});
      };
      const saved = options.map(button => ({button, attrs: ['role', 'tabindex', 'aria-checked', 'data-journal-filter'].map(name => [name, button.getAttribute(name)])}));
      options.forEach(button => {
        button.dataset.journalFilter = button === allButton ? '' : key(button.textContent);
        button.setAttribute('role', 'menuitemradio');
        button.tabIndex = 0;
        button.setAttribute('aria-checked', String(button === allButton));
        const click = event => { event.preventDefault(); event.stopPropagation(); choose(button); };
        const keydown = event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault(); event.stopPropagation(); choose(button);
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); event.stopPropagation();
            const offset = event.key === 'ArrowDown' ? 1 : -1;
            options[(options.indexOf(button) + offset + options.length) % options.length].focus();
          }
          if (event.key === 'Escape') { event.preventDefault(); close(); }
        };
        button.addEventListener('click', click);
        button.addEventListener('keydown', keydown);
        disposers.push(() => {
          button.removeEventListener('click', click);
          button.removeEventListener('keydown', keydown);
        });
      });
      disposers.push(() => {
        revision++;
        tween?.kill();
        list.style.removeProperty('opacity');
        items.forEach(item => item.removeAttribute('data-journal-filter-hidden'));
        label.textContent = originalLabel;
        saved.forEach(({button, attrs}) => attrs.forEach(([name, value]) => value === null ? button.removeAttribute(name) : button.setAttribute(name, value)));
        allItem.remove(); empty.remove(); status.remove();
        refresh();
      });
    });
    document.head.append(style);
  }
  window.SkriturJournalFilter = {
    destroy() {
      document.removeEventListener('DOMContentLoaded', initialize);
      disposers.reverse().forEach(dispose => dispose());
      style.remove();
      delete window.SkriturJournalFilter;
    },
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once: true});
  else initialize();
})();
