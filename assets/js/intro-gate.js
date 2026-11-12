// Loaded as a plain, blocking script in <head>, so it runs before the first paint.
// - data-pk-intro hides the page so the hyperspace intro can reveal it.
// - data-pk-gate also shows the Enter screen: browsers only allow sound after a click, so the visitor's
//   click on Enter is what lets the warp play with sound. Once per browser session, and never for links
//   straight to a section or project (#contact, #p-robocon), which should open on their content.
// Both are skipped for reduced motion, and for pages opened in a background tab.
// main.js sets data-pk-ready when it takes over; if it never does (the script failed to load), the page
// is revealed after 3.2 s rather than left hidden.
// (A file rather than an inline script, so the Content-Security-Policy can forbid inline scripts.)
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.visibilityState !== 'visible') return;
  root.setAttribute('data-pk-intro', '');
  var entered = false;
  try { entered = sessionStorage.getItem('pk-entered') === '1'; } catch (e) { /* storage blocked: show the gate */ }
  if (!entered && !location.hash) root.setAttribute('data-pk-gate', '');
  setTimeout(function () {
    if (root.hasAttribute('data-pk-ready')) return;
    root.removeAttribute('data-pk-gate');
    root.removeAttribute('data-pk-intro');
  }, 3200);
})();
