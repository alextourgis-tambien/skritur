/* Connect Webflow to Fontdue's store, type testers and character viewers. */
(() => {
  'use strict';
  if (window.SkriturFontdueTesters) return;
  const storeURL = 'https://www.skritur.eu';
  const hosts = [...document.querySelectorAll('.typetester__wrapper, .glyph__wrapper')];
  const pageSlug = location.pathname.match(/^\/fonts\/([^/]+)\/?$/)?.[1];
  const cartButtons = [...document.querySelectorAll('.cart__wrapper')];
  const buyButtons = [...document.querySelectorAll('.nav__font--wrapper')];
  const collections = {
    bilzig: 'Rm9udENvbGxlY3Rpb246MjE1MDkxNTU1ODk5OTM0MjQ1NQ==',
    principio: 'Rm9udENvbGxlY3Rpb246MTkzNDQxNDM2NzM5NTQyOTc4NA==',
    gallmau: 'Rm9udENvbGxlY3Rpb246MTcxNzQ2NDg3MTc4NjAwMzc4Nw==',
    brito: 'Rm9udENvbGxlY3Rpb246MTQ1MjEzNTk1NTQ0NzQzMTA2Nw==',
    kornog: 'Rm9udENvbGxlY3Rpb246MTQ1NzQ1NDc4MjkxNzkxODE4MQ==',
  };
  if (!hosts.length && !cartButtons.length && !buyButtons.length) return;
  const nodes = [];
  const restoreAttributes = [];
  const connectButton = (button, route, fallback) => {
    for (const [name, value] of Object.entries({
      'fontdue-click': 'open-store-modal',
      'fontdue-store-route': route,
      ...(button.tagName === 'A' ? {href: fallback} : {role: 'button', tabindex: '0'}),
    })) {
      const original = button.getAttribute(name);
      restoreAttributes.push(() => original === null ? button.removeAttribute(name) : button.setAttribute(name, original));
      button.setAttribute(name, value);
    }
  };
  cartButtons.forEach(button => connectButton(button, 'cart', storeURL + '/?store=cart'));
  if (collections[pageSlug]) buyButtons.forEach(button => connectButton(button,
    'product/' + collections[pageSlug], storeURL + '/fonts/' + pageSlug + '?store=product/' + pageSlug));
  const modal = document.createElement('fontdue-store-modal');
  modal.setAttribute('data-lenis-prevent', '');
  document.body.append(modal);
  nodes.push(modal);
  const style = document.createElement('style');
  style.textContent = `
    .typetester__wrapper { width: 100%; min-width: 0; }
    .typetester__wrapper fontdue-type-testers { display: block; width: 100%; }
    .typetester__wrapper .type-tester { border-top-color: rgba(0, 0, 0, .18); }
    .typetester__wrapper .skritur-fontdue-status { font: inherit; opacity: .5; padding: 2rem 0; }
    .glyph__wrapper { width: 100%; min-width: 0; --character_viewer_sticky_top: 70px; }
    .glyph__wrapper fontdue-character-viewer { display: block; width: 100%; }
    .glyph__wrapper .skritur-fontdue-status { font: inherit; opacity: .5; padding: 2rem 0; }
  `;
  document.head.append(style);
  nodes.push(style);
  let destroyed = false;
  let runtime;
  const resize = () => {
    window.SkriturAnimations?.lenis?.resize();
    window.ScrollTrigger?.refresh();
  };
  const observer = new ResizeObserver(resize);
  const initializeRuntime = () => runtime ||= (async () => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://js.fontdue.com/fontdue.css';
    document.head.append(css);
    nodes.push(css);
    const {default: fontdue} = await import('https://js.fontdue.com/fontdue.esm.js');
    if (destroyed) return;
    fontdue.initialize({
      url: storeURL,
      config: {
        typeTester: { selectable: true, shy: false, buyButton: false },
      },
    });
  })();
  // The cart must be available before visitors scroll to the preview widgets.
  initializeRuntime().catch(error => console.warn('[Skritur] Fontdue store unavailable.', error));
  const mount = async host => {
    const isViewer = host.matches('.glyph__wrapper');
    const slug = host.getAttribute('data-fontdue-collection') || decodeURIComponent(pageSlug);
    const status = document.createElement('p');
    status.className = 'skritur-fontdue-status';
    status.setAttribute('role', 'status');
    status.textContent = isViewer ? 'Chargement des glyphes…' : 'Chargement du testeur…';
    host.append(status);
    nodes.push(status);
    try {
      await initializeRuntime();
      if (destroyed || !host.isConnected) return;
      const testers = document.createElement(isViewer ? 'fontdue-character-viewer' : 'fontdue-type-testers');
      testers.setAttribute('collection-slug', slug);
      if (!isViewer) testers.setAttribute('default-mode', 'local');
      testers.setAttribute('aria-label', (isViewer ? 'Explorer les glyphes de ' : 'Tester les styles de ') + document.title);
      host.append(testers);
      nodes.push(testers);
      status.remove();
      observer.observe(host);
      resize();
    } catch (error) {
      if (destroyed) return;
      status.textContent = isViewer ? 'Les glyphes sont momentanément indisponibles. ' : 'Le testeur est momentanément indisponible. ';
      const link = document.createElement('a');
      link.href = storeURL + '/fonts/' + encodeURIComponent(slug);
      link.textContent = isViewer ? 'Explorer les glyphes sur Fontdue' : 'Ouvrir le testeur sur Fontdue';
      status.append(link);
      console.warn('[Skritur] Fontdue type testers unavailable.', error);
    }
  };
  const lazy = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    lazy.unobserve(entry.target);
    mount(entry.target);
  }), {rootMargin: '500px 0px'});
  if (pageSlug) hosts.forEach(host => lazy.observe(host));
  window.SkriturFontdueTesters = {
    destroy() {
      destroyed = true;
      lazy.disconnect(); observer.disconnect();
      nodes.reverse().forEach(node => node.remove());
      restoreAttributes.reverse().forEach(restore => restore());
      delete window.SkriturFontdueTesters;
    },
  };
})();
