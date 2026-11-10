// Beginner-only filter for a week page. Without JavaScript the form stays hidden.
// Language filtering is plain links to /language/ pages, so it needs no script.
(() => {
  const form = document.querySelector('.filters');
  if (!form) return;
  form.hidden = false;
  const status = form.querySelector('.filters-status');
  const entries = document.querySelectorAll('.entry');

  form.addEventListener('change', () => {
    const only = form.elements.beginner.checked;
    let shown = 0;
    entries.forEach((li) => {
      li.hidden = only && li.dataset.beginner !== 'true';
      if (!li.hidden) shown++;
    });
    status.textContent = only ? `Showing ${shown} of ${entries.length} repositories.` : '';
  });
})();
