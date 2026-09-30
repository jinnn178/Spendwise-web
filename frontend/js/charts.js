export function categoryTotals(transactions, month) {
  const totals = new Map();
  transactions
    .filter(item => item.type === 'out' && item.date.startsWith(month))
    .forEach(item => totals.set(item.category || 'Other', (totals.get(item.category || 'Other') || 0) + Number(item.amount || 0)));
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

export function categoryChart(transactions, month, formatMoney, escapeHtml) {
  const rows = categoryTotals(transactions, month);
  if (!rows.length) return '<div class="category-empty">No spending data this month.</div>';

  const colors = ['#44d19d', '#6c8cff', '#ffb454', '#ff6b7a', '#9b7cff', '#43b9d0', '#d8ca58', '#ef78bb'];
  const total = rows.reduce((sum, row) => sum + row[1], 0);
  let angle = 0;
  const slices = rows.map((row, index) => {
    const start = angle;
    angle += row[1] / total * 360;
    return `${colors[index % colors.length]} ${start}deg ${angle}deg`;
  }).join(', ');

  const legend = rows.map((row, index) => `
    <div class="category-legend-row">
      <span><i style="background:${colors[index % colors.length]}"></i>${escapeHtml(row[0])}</span>
      <strong>${formatMoney(row[1])}</strong>
    </div>`).join('');

  return `<div class="category-chart"><div class="category-pie" style="background:conic-gradient(${slices})" aria-label="Spending by category"></div><div class="category-legend">${legend}</div></div>`;
}
