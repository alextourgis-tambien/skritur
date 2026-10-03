(() => {
  'use strict';
  if (window.SkriturFontCatalogue) return;
  const cards = [...document.querySelectorAll('.font__link')];
  if (!cards.length) return;
  const snapshot = [{"children":[{"fontStyles":[{"name":"Regular","sku":{"price":{"amount":4000,"currency":"EUR"}}},{"name":"Italic","sku":{"price":{"amount":4000,"currency":"EUR"}}},{"name":"Medium","sku":{"price":{"amount":4000,"currency":"EUR"}}},{"name":"Medium Italic","sku":{"price":{"amount":4000,"currency":"EUR"}}},{"name":"Bold","sku":{"price":{"amount":4000,"currency":"EUR"}}},{"name":"Bold Italic","sku":{"price":{"amount":4000,"currency":"EUR"}}},{"name":"Black","sku":{"price":{"amount":4000,"currency":"EUR"}}},{"name":"Black Italic","sku":{"price":{"amount":4000,"currency":"EUR"}}}],"isVariableFont":false,"name":"Bilzig"}],"fontStyles":[],"name":"Bilzig","path":"/fonts/bilzig","totalStyles":8},{"children":[],"fontStyles":[{"name":"Regular","sku":{"price":{"amount":4000,"currency":"EUR"}}}],"name":"PRINCIPIO","path":"/fonts/principio","totalStyles":1},{"children":[],"fontStyles":[{"name":"Regular","sku":{"price":{"amount":4000,"currency":"EUR"}}}],"name":"Gallmau","path":"/fonts/gallmau","totalStyles":1},{"children":[{"fontStyles":[{"name":"Thin","sku":{"price":{"amount":4000,"currency":"EUR"}}},{"name":"Thin Italic","sku":{"price":{"amount":4000,"currency":"EUR"}}},{"name":"Extra Light","sku":{"price":{"amount":4000,"currency":"EUR"}}},{"name":"Extra Light Italic","sku":{"price":{"amount":4000,"currency":"EUR"}}},{"name":"Light","sku":{"price":{"amount":4000,"currency":"EUR"}}},{"name":"Light Italic","sku":{"price":{"amount":4000,"currency":"EUR"}}},{"name":"Regular","sku":{"price":{"amount":4000,"currency":"EUR"}}},{"name":"Italic","sku":{"price":{"amount":4000,"currency":"EUR"}}},{"name":"Medium","sku":{"price":{"amount":4000,"currency":"EUR"}}},{"name":"Medium Italic","sku":{"price":{"amount":4000,"currency":"EUR"}}},{"name":"Bold","sku":{"price":{"amount":4000,"currency":"EUR"}}},{"name":"Bold Italic","sku":{"price":{"amount":4000,"currency":"EUR"}}}],"isVariableFont":false,"name":"Brito"},{"fontStyles":[{"name":"Regular","sku":{"price":{"amount":15000,"currency":"EUR"}}}],"isVariableFont":true,"name":"Brito Variable"}],"fontStyles":[],"name":"Brito","path":"/fonts/brito","totalStyles":13},{"children":[],"fontStyles":[{"name":"Original","sku":{"price":{"amount":4000,"currency":"EUR"}}},{"name":"Print","sku":{"price":{"amount":4000,"currency":"EUR"}}}],"name":"Kornog","path":"/fonts/kornog","totalStyles":2}];
  const query = `{
    viewer { fontCollections(first: 30, onlyRoots: true) { edges { node {
      name path totalStyles
      fontStyles { name sku { price { amount currency } } }
      children { name isVariableFont fontStyles { name sku { price { amount currency } } } }
    } } } }
  }`;
  const controller = new AbortController();

  function styleLines(collection) {
    if (collection.isVariableFont) return [collection.name];
    const names = (collection.fontStyles || []).map(style => style.name);
    const lines = [];
    for (let i = 0; i < names.length; i++) {
      const italic = names[i] === 'Regular' ? 'Italic' : `${names[i]} Italic`;
      if (names[i + 1] === italic) lines.push(`${names[i++]} / ${italic}`);
      else lines.push(names[i]);
    }
    return lines;
  }

  function apply(collections) {
    cards.forEach(card => {
      const path = new URL(card.href, location.href).pathname.replace(/\/$/, '');
      const collection = collections.find(item => item.path === path);
      if (!collection) return;
      const groups = [collection, ...(collection.children || [])];
      const styles = groups.flatMap(item => item.fontStyles || []);
      const prices = styles.map(style => style.sku?.price).filter(price =>
        price && Number.isFinite(Number(price.amount)) && Number(price.amount) > 0);
      if (!styles.length || !prices.length) return;
      const currency = prices[0].currency;
      const minimum = Math.min(...prices.filter(price => price.currency === currency).map(price => Number(price.amount))) / 100;
      const price = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(minimum) + (currency === 'EUR' ? '€' : ` ${currency}`);
      const variable = groups.filter(item => item.isVariableFont).reduce((count, item) => count + item.fontStyles.length, 0);
      const count = styles.length - variable;
      const label = `${count} ${count === 1 ? 'style' : 'styles'}${variable ? ` + ${variable} variable ${variable === 1 ? 'font' : 'fonts'}` : ''}, from ${price}`;
      const wrapper = card.querySelector('.font__style-wrapper');
      const lines = groups.flatMap(styleLines);
      if (wrapper && wrapper.dataset.fontdueStyles !== JSON.stringify(lines)) {
        wrapper.replaceChildren(...lines.map(line => {
          const element = document.createElement('div');
          element.className = 'text__style';
          element.textContent = line;
          return element;
        }));
        wrapper.dataset.fontdueStyles = JSON.stringify(lines);
      }
      const target = card.querySelector('.font__wrapper-right > .text-block');
      if (target) {
        // Preserve the existing GSAP hover wrappers and their original text nodes.
        const rolls = target.querySelectorAll('.skritur-roll__original, .skritur-roll__copy');
        (rolls.length ? [...rolls] : [target]).forEach(element => {
          if (element.childNodes.length === 1 && element.firstChild.nodeType === Node.TEXT_NODE) element.firstChild.nodeValue = label;
          else element.textContent = label;
        });
        target.title = 'Starting price per style. Final price depends on licence and company size.';
      }
    });
    window.SkriturAnimations?.requestLayoutRefresh?.();
  }

  // Verified public Fontdue snapshot keeps the catalogue correct even if the API is unavailable.
  apply(snapshot);
  const timeout = setTimeout(() => controller.abort(), 8000);
  fetch('https://www.skritur.eu/graphql', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }), signal: controller.signal,
  }).then(response => {
    if (!response.ok) throw new Error(`Fontdue: ${response.status}`);
    return response.json();
  }).then(result => {
    if (result.errors) throw new Error('Fontdue catalogue query failed');
    const edges = result.data?.viewer?.fontCollections?.edges;
    if (edges?.length) apply(edges.map(edge => edge.node).filter(Boolean));
  }).catch(error => {
    if (error.name !== 'AbortError') console.warn('Fontdue catalogue: using verified snapshot', error);
  }).finally(() => clearTimeout(timeout));
  window.SkriturFontCatalogue = { destroy() { controller.abort(); clearTimeout(timeout); delete window.SkriturFontCatalogue; } };
})();
