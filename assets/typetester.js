/* Site-wide type preview: native text entry and clipped, softly faded samples. */
(() => {
  'use strict';
  if (window.SkriturTypetester) return;
  const disposers = [];
  const originals = new Map();
  let frame;
  let destroyed = false;
  const style = document.createElement('style');
  style.textContent = `
    .typetester.skritur-typetester { cursor: text; }
    .skritur-typetester .type__icon { flex-shrink: 0; }
    .skritur-typetester input.typetester__text {
      flex: 1 1 0%; width: 100%; min-width: 0; border: 0;
      border-radius: 0; padding: 0; margin: 0; background: transparent;
      color: inherit; box-shadow: none; outline: none; appearance: none;
    }
    .skritur-typetester input.typetester__text::placeholder { color: inherit; opacity: 1; }
    .typetester.skritur-typetester:focus-within { outline: 2px solid #315bff; outline-offset: 3px; }
    .font__wrapper-left.skritur-type-clip { min-width: 0; max-width: 100%; overflow: hidden; }
    .skritur-type-clip .font__font { flex: 0 0 auto; white-space: pre; width: max-content; max-width: none; }
    .skritur-type-clip.skritur-type-overflow {
      -webkit-mask-image: linear-gradient(to right, #000 0%, #000 calc(100% - min(48px, 12%)), transparent 100%);
      mask-image: linear-gradient(to right, #000 0%, #000 calc(100% - min(48px, 12%)), transparent 100%);
    }
  `;
  document.head.append(style);

  function initialize() {
    if (destroyed) return;
    const samples = [...document.querySelectorAll('.font__wrapper-left .font__font')];
    const wrappers = [...new Set(samples.map(sample => sample.closest('.font__wrapper-left')))];
    const inputs = [];
    samples.forEach(sample => originals.set(sample, sample.innerHTML));
    wrappers.forEach(wrapper => wrapper.classList.add('skritur-type-clip'));
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        wrappers.forEach(wrapper => wrapper.classList.toggle('skritur-type-overflow', wrapper.scrollWidth > wrapper.clientWidth + 1));
      });
    };
    const update = value => {
      inputs.forEach(input => { if (input.value !== value) input.value = value; });
      samples.forEach(sample => {
        if (value.length) sample.textContent = value;
        else sample.innerHTML = originals.get(sample);
      });
      measure();
    };
    document.querySelectorAll('.typetester').forEach(host => {
      const label = host.querySelector('.typetester__text');
      if (!label || label.matches('input')) return;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = label.className;
      input.placeholder = label.textContent.trim();
      input.setAttribute('aria-label', 'Type text to preview the typefaces');
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('enterkeyhint', 'done');
      label.replaceWith(input);
      host.classList.add('skritur-typetester');
      inputs.push(input);
      const onInput = () => update(input.value);
      const onClick = event => {
        if (host.matches('a')) event.preventDefault();
        input.focus();
      };
      const onKeyDown = event => { if (event.key === 'Enter') event.preventDefault(); };
      input.addEventListener('input', onInput);
      input.addEventListener('keydown', onKeyDown);
      host.addEventListener('click', onClick);
      disposers.push(() => {
        input.removeEventListener('input', onInput);
        input.removeEventListener('keydown', onKeyDown);
        host.removeEventListener('click', onClick);
        input.replaceWith(label);
        host.classList.remove('skritur-typetester');
      });
    });
    const observer = new ResizeObserver(measure);
    [...wrappers, ...samples].forEach(element => observer.observe(element));
    disposers.push(() => {
      observer.disconnect();
      wrappers.forEach(wrapper => wrapper.classList.remove('skritur-type-clip', 'skritur-type-overflow'));
      samples.forEach(sample => { sample.innerHTML = originals.get(sample); });
    });
    if (document.fonts) document.fonts.ready.then(() => { if (!destroyed) measure(); });
    measure();
  }
  window.SkriturTypetester = {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      disposers.reverse().forEach(dispose => dispose());
      document.removeEventListener('DOMContentLoaded', initialize);
      style.remove();
      delete window.SkriturTypetester;
    },
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once:true});
  else initialize();
})();
