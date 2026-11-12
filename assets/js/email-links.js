/**
 * Email links: a plain mailto: does nothing on a computer with no mail app set up (common for anyone who
 * uses Gmail in the browser). So a click copies the address and shows a small note with two ways to
 * write: in Gmail, or in the mail app. The href stays mailto:, so without this script the link still works
 * where a mail app is set up, and "copy link address" still gives the address.
 */
const SHOW_FOR = 7000;  // ms

export function startEmailLinks() {
  const toast = document.querySelector('[data-toast]');
  const links = document.querySelectorAll('a[data-email]');
  if (!toast || !links.length) return;
  let timer = 0;

  const hide = () => {
    toast.classList.remove('is-on');
    clearTimeout(timer);
    timer = setTimeout(() => { toast.hidden = true; }, 250);
  };
  const el = (tag, attrs, text) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, v);
    if (text) node.textContent = text;
    return node;
  };

  const show = (address) => {
    const close = el('button', { type: 'button', class: 'toast__close', 'aria-label': 'Close' }, '×');
    close.addEventListener('click', hide);
    const status = el('span', { class: 'toast__status' }, 'Email');
    toast.replaceChildren(
      status,
      el('span', { class: 'toast__address' }, address),
      el('a', { class: 'toast__link', href: `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(address)}`, target: '_blank', rel: 'noopener' }, 'Gmail ↗'),
      el('a', { class: 'toast__link', href: `mailto:${address}` }, 'Mail app'),
      close,
    );
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('is-on'));
    clearTimeout(timer);
    timer = setTimeout(hide, SHOW_FOR);
    return status;
  };

  links.forEach((link) => link.addEventListener('click', (e) => {
    e.preventDefault();
    const address = link.getAttribute('href').replace(/^mailto:/, '').split('?')[0];
    // show the note straight away; say "copied" once the clipboard has it (it may ask, or refuse)
    const status = show(address);
    navigator.clipboard?.writeText(address).then(() => { status.textContent = 'Email copied'; status.classList.add('is-copied'); }, () => {});
  }));
  toast.addEventListener('mouseenter', () => clearTimeout(timer));
  toast.addEventListener('mouseleave', () => { timer = setTimeout(hide, SHOW_FOR / 2); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !toast.hidden) hide(); });
}
