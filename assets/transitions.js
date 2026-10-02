/* Early head script: a white fade between pages and on the first home load. */
(() => {
  'use strict';
  if (window.SkriturTransitions) return;
  const root = document.documentElement;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const key = 'skritur:page-transition';
  const exitDuration = 700;
  const arrivalDuration = 900;
  const easing = 'cubic-bezier(.37, 0, .63, 1)';
  let navigating = false;
  let destination;
  let navigationTimer;
  let arrivalTimer;
  const style = document.createElement('style');
  style.textContent = `
    html.skritur-leaving::after, html.skritur-arriving::after {
      content: ''; position: fixed; inset: 0; z-index: 2147483647;
      pointer-events: none; background: #fff;
    }
    html.skritur-leaving::after {
      pointer-events: auto;
      animation: skritur-page-out ${exitDuration}ms ${easing} both;
    }
    html.skritur-arriving::after { opacity: 1; }
    html.skritur-arriving.skritur-revealing::after { animation: skritur-page-in ${arrivalDuration}ms ${easing} both; }
    @keyframes skritur-page-out {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes skritur-page-in { from { opacity: 1; } to { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) {
      html.skritur-leaving::after, html.skritur-arriving::after { display: none; }
    }
  `;
  document.head.append(style);

  function reset() {
    clearTimeout(navigationTimer);
    clearTimeout(arrivalTimer);
    root.classList.remove('skritur-leaving', 'skritur-arriving', 'skritur-revealing');
    navigating = false;
    destination = null;
  }

  function revealArrival() {
    clearTimeout(arrivalTimer);
    if (!root.classList.contains('skritur-arriving') || root.classList.contains('skritur-revealing')) return;
    root.classList.add('skritur-revealing');
    arrivalTimer = setTimeout(() => root.classList.remove('skritur-arriving', 'skritur-revealing'), arrivalDuration + 100);
  }

  // Home also fades in on direct visits; storage is optional.
  let shouldArrive = location.pathname === '/';
  try {
    const pending = JSON.parse(sessionStorage.getItem(key) || 'null');
    sessionStorage.removeItem(key);
    shouldArrive ||= Boolean(pending && pending.url === location.pathname + location.search
      && Date.now() - pending.time < 15000);
  } catch (_) { /* Home still works when storage is blocked. */ }
  if (!motion.matches && shouldArrive) {
    root.classList.add('skritur-arriving');
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', revealArrival, { once: true });
    else requestAnimationFrame(revealArrival);
    // Never leave the site covered if document loading stalls.
    arrivalTimer = setTimeout(revealArrival, 1500);
  }

  function navigate() {
    if (!destination) return;
    const url = destination;
    destination = null;
    clearTimeout(navigationTimer);
    try { sessionStorage.setItem(key, JSON.stringify({ url: url.pathname + url.search, time: Date.now() })); }
    catch (_) { /* A blocked storage API must never break a link. */ }
    location.assign(url.href);
  }

  function onClick(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey
      || event.shiftKey || event.altKey || motion.matches) return;
    const link = event.target.closest?.('a[href]');
    if (!link || /\.(pdf|zip|rar|7z|png|jpe?g|gif|webp|avif|svg|mp4|mp3|woff2?|ttf|otf)$/i.test(new URL(link.href, location.href).pathname) || link.hasAttribute('download') || link.closest('[data-no-transition]')
      || (link.target && link.target.toLowerCase() !== '_self')) return;
    let url;
    try { url = new URL(link.href, location.href); } catch (_) { return; }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== location.origin
      || (url.pathname === location.pathname && url.search === location.search)) return;
    if (navigating) { event.preventDefault(); return; }
    event.preventDefault();
    reset();
    navigating = true;
    destination = url;
    root.classList.add('skritur-leaving');
    // Fallback for disabled CSS animations or missed animationend events.
    navigationTimer = setTimeout(navigate, exitDuration + 100);
  }

  function onAnimationEnd(event) {
    if (event.target !== root) return;
    if (event.animationName === 'skritur-page-out') navigate();
    if (event.animationName === 'skritur-page-in') root.classList.remove('skritur-arriving', 'skritur-revealing');
  }
  function onMotionChange() {
    if (motion.matches && navigating) navigate();
    else if (motion.matches) reset();
  }
  document.addEventListener('click', onClick);
  root.addEventListener('animationend', onAnimationEnd);
  const onPageShow = event => { if (event.persisted) reset(); };
  window.addEventListener('pageshow', onPageShow); // Restore a clear page from the back-forward cache.
  motion.addEventListener('change', onMotionChange);
  window.SkriturTransitions = {
    destroy() {
      reset();
      document.removeEventListener('click', onClick);
      document.removeEventListener('DOMContentLoaded', revealArrival);
      root.removeEventListener('animationend', onAnimationEnd);
      window.removeEventListener('pageshow', onPageShow);
      motion.removeEventListener('change', onMotionChange);
      style.remove();
      delete window.SkriturTransitions;
    },
  };
})();
