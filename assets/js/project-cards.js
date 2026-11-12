/**
 * Project cards: each card opens its project's full write-up in a modal <dialog>.
 * Esc, the close button or a click on the dimmed page closes it. A project's link (#p-robocon)
 * opens its dialog directly, so a single project can be shared.
 */
export function startProjectCards() {
  const dialogFor = (id) => document.getElementById(`dialog-${id}`);
  // the browser hands focus back to the card when its dialog closes. For keyboard users that's where they
  // should be; after a mouse click it would leave the card stuck in its lifted, focused look, so let go of it.
  let clickedCard = null;
  const open = (id) => {
    const dialog = dialogFor(id);
    if (!dialog || dialog.open) return;
    dialog.showModal();
    dialog.querySelector('.pdialog__panel')?.scrollTo(0, 0);
    if (location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
  };

  document.querySelectorAll('[data-opens]').forEach((card) => {
    card.addEventListener('click', (e) => { clickedCard = e.detail > 0 ? card : null; open(card.dataset.opens); });
  });
  document.querySelectorAll('.pdialog').forEach((dialog) => {
    const id = dialog.id.replace(/^dialog-/, '');
    dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
    // a click that lands on the dialog itself, not its content, is a click on the dimmed page around it
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      if (location.hash === `#${id}`) history.replaceState(null, '', location.pathname + location.search);
      if (clickedCard && document.activeElement === clickedCard) clickedCard.blur();
      clickedCard = null;
    });
  });

  const fromHash = () => { const id = location.hash.slice(1); if (id.startsWith('p-')) open(id); };
  window.addEventListener('hashchange', fromHash);
  fromHash();
}
