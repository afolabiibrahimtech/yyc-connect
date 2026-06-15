// ── Budget calculator ─────────────────────────────────────────────────────────
const fields = ['rent', 'food', 'transit', 'winter', 'misc'];

export function updateBudget() {
  let total = 0;
  for (const id of fields) {
    const input = document.getElementById('br-' + id);
    const label = document.getElementById('bv-' + id);
    if (!input || !label) continue;
    const v = parseInt(input.value, 10);
    label.textContent = '$' + v.toLocaleString();
    total += v;
  }
  const totalEl = document.getElementById('budget-total');
  if (totalEl) totalEl.textContent = '$' + total.toLocaleString();
}

export function initBudget() {
  for (const id of fields) {
    document.getElementById('br-' + id)?.addEventListener('input', updateBudget);
  }
  updateBudget(); // set initial display
}
