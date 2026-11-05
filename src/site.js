// Copy-to-clipboard for citation boxes.
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-copy]');
  if (!btn) return;
  const src = document.querySelector(btn.dataset.copy);
  if (!src) return;
  const label = btn.querySelector('span');
  try {
    await navigator.clipboard.writeText(src.textContent.trim());
    if (label) label.textContent = 'Copied';
  } catch {
    const range = document.createRange();
    range.selectNodeContents(src);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    if (label) label.textContent = 'Selected';
  }
  setTimeout(() => label && (label.textContent = 'Copy'), 1800);
});
