/* Group the published Support CMS items by their bound category slug. */
(() => {
  'use strict';
  if (window.SkriturSupport) return;
  const disposers = [];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const style = document.createElement('style');
  style.textContent = `
    .skritur-support-category { scroll-margin-top: 90px; }
    .skritur-support-category + .skritur-support-category { margin-top: 64px; }
    .skritur-support-empty { opacity: .55; margin: 20px 0 0; }
    .support__title-link[data-support-category] { cursor: pointer; }
    .support__title-link[data-support-category]:focus-visible { outline: 1px solid currentColor; outline-offset: 4px; }
    .skritur-support-category:focus { outline: none; }
  `;
  function refresh() {
    window.SkriturAnimations?.lenis?.resize();
    window.ScrollTrigger?.refresh();
  }
  function initialize() {
    document.querySelectorAll('.support__header').forEach((root, rootIndex) => {
      const template = root.querySelector('.question__cat');
      const originalList = template?.querySelector('.question__list');
      const links = [...root.querySelectorAll('.support__title-link[data-support-category]')];
      if (!template || !originalList || !links.length) return;
      const items = [...originalList.children].filter(item => item.matches('.question__item'));
      if (items.some(item => !item.dataset.supportCategory)) {
        console.warn('Skritur Support: missing CMS category binding; original list preserved.');
        return;
      }
      const parent = template.parentElement;
      const english = root.classList.contains('is--en');
      const categories = new Map();
      const originals = items.map(item => ({item, marker: document.createComment('support-item')}));
      originals.forEach(({item, marker}) => item.before(marker));
      const nodes = [];
      function category(slug, title) {
        if (categories.has(slug)) return categories.get(slug);
        const section = template.cloneNode(false);
        section.removeAttribute('id');
        section.removeAttribute('data-w-id');
        section.classList.add('skritur-support-category');
        section.id = `support-${rootIndex}-${slug}`;
        section.tabIndex = -1;
        const heading = document.createElement('h2');
        heading.className = template.querySelector('.question__title')?.className || 'question__title';
        heading.textContent = title;
        heading.id = `${section.id}-title`;
        section.setAttribute('aria-labelledby', heading.id);
        const collection = template.querySelector('.question__collection').cloneNode(false);
        collection.removeAttribute('id');
        collection.removeAttribute('data-w-id');
        const list = originalList.cloneNode(false);
        list.removeAttribute('id');
        list.removeAttribute('data-w-id');
        collection.append(list);
        section.append(heading, collection);
        parent.insertBefore(section, template);
        nodes.push(section);
        const result = {section, list};
        categories.set(slug, result);
        return result;
      }
      links.forEach(link => category(link.dataset.supportCategory, link.textContent.trim()));
      items.forEach(item => {
        const slug = item.dataset.supportCategory;
        const group = categories.get(slug) || category(slug, english ? 'Other questions' : 'Autres questions');
        group.list.append(item); // Move originals to preserve Webflow dropdown handlers and IDs.
      });
      categories.forEach(({section, list}) => {
        if (list.children.length) return;
        const empty = document.createElement('p');
        empty.className = 'skritur-support-empty';
        empty.textContent = english ? 'No questions in this category yet.' : 'Aucune question dans cette catégorie pour le moment.';
        list.parentElement.replaceWith(empty);
        section.dataset.supportEmpty = 'true';
      });
      const originalHidden = template.hidden;
      const originalDisplay = template.style.display;
      template.hidden = true;
      template.style.display = 'none';
      links.forEach(link => {
        const target = categories.get(link.dataset.supportCategory).section;
        const attributes = ['role', 'tabindex', 'aria-controls', 'href'].map(name => [name, link.getAttribute(name)]);
        link.setAttribute('role', 'link');
        link.tabIndex = 0;
        link.setAttribute('aria-controls', target.id);
        if (link.tagName === 'A') link.setAttribute('href', `#${target.id}`);
        const go = event => {
          if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
          if (event.type === 'click' && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
          event.preventDefault();
          target.focus({preventScroll: true});
          const lenis = window.SkriturAnimations?.lenis;
          if (lenis && !motion.matches) lenis.scrollTo(target, {offset: -90, duration: .8});
          else target.scrollIntoView({behavior: motion.matches ? 'instant' : 'smooth', block: 'start'});
        };
        link.addEventListener('click', go);
        link.addEventListener('keydown', go);
        disposers.push(() => {
          link.removeEventListener('click', go);
          link.removeEventListener('keydown', go);
          attributes.forEach(([name, value]) => value === null ? link.removeAttribute(name) : link.setAttribute(name, value));
        });
      });
      disposers.push(() => {
        originals.forEach(({item, marker}) => { marker.replaceWith(item); });
        nodes.forEach(node => node.remove());
        template.hidden = originalHidden;
        template.style.display = originalDisplay;
      });
    });
    refresh();
  }
  document.head.append(style);
  window.SkriturSupport = {
    destroy() {
      document.removeEventListener('DOMContentLoaded', initialize);
      disposers.reverse().forEach(dispose => dispose());
      style.remove();
      delete window.SkriturSupport;
      refresh();
    },
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once: true});
  else initialize();
})();
