// Loads this design system into the template. In a consuming project,
// point base at the bound DS folder (e.g. '_ds/<folder>') — one line to edit.
(() => {
  const base = '../..';
  for (const p of ["styles.css"]) {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = base + '/' + p;
    document.head.appendChild(l);
  }
  const s = document.createElement('script');
  s.src = base + '/_ds_bundle.js';
  s.onerror = () => {}; // tolerate a not-yet-compiled bundle in a fresh DS
  document.head.appendChild(s);
})();
