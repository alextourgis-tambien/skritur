/* Mount Fontdue's native, CMS-managed type testers on Webflow font pages. */
(() => {
  'use strict';
  if (window.SkriturFontdueTesters) return;
  const storeURL = 'https://www.skritur.eu';
  const hosts = [...document.querySelectorAll('.typetester__wrapper')];
  const pageSlug = location.pathname.match(/^\/fonts\/([^/]+)\/?$/)?.[1];
  if (!hosts.length || !pageSlug) return;
  const nodes = [];
  const style = document.createElement('style');
  style.textContent = `
    .typetester__wrapper { width: 100%; min-width: 0; }
    .typetester__wrapper fontdue-type-testers { display: block; width: 100%; }
    .typetester__wrapper .skritur-fontdue-status { font: inherit; opacity: .5; padding: 2rem 0; }
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
  const mount = async host => {
    const slug = host.getAttribute('data-fontdue-collection') || decodeURIComponent(pageSlug);
    const status = document.createElement('p');
    status.className = 'skritur-fontdue-status';
    status.setAttribute('role', 'status');
    status.textContent = 'Chargement du testeur…';
    host.append(status);
    nodes.push(status);
    try {
      await initializeRuntime();
      if (destroyed || !host.isConnected) return;
      const testers = document.createElement('fontdue-type-testers');
      testers.setAttribute('collection-slug', slug);
      testers.setAttribute('default-mode', 'local');
      testers.setAttribute('aria-label', 'Tester les styles de ' + document.title);
      host.append(testers);
      nodes.push(testers);
      status.remove();
      observer.observe(host);
      resize();
    } catch (error) {
      if (destroyed) return;
      status.textContent = 'Le testeur est momentanément indisponible. ';
      const link = document.createElement('a');
      link.href = storeURL + '/fonts/' + encodeURIComponent(slug);
      link.textContent = 'Ouvrir le testeur sur Fontdue';
      status.append(link);
      console.warn('[Skritur] Fontdue type testers unavailable.', error);
    }
  };
  const lazy = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    lazy.unobserve(entry.target);
    mount(entry.target);
  }), {rootMargin: '500px 0px'});
  hosts.forEach(host => lazy.observe(host));
  window.SkriturFontdueTesters = {
    destroy() {
      destroyed = true;
      lazy.disconnect(); observer.disconnect();
      nodes.reverse().forEach(node => node.remove());
      delete window.SkriturFontdueTesters;
    },
  };
})();
