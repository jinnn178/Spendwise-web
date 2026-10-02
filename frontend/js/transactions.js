export const TRANSACTION_CATEGORIES = [
  'Food & drink',
  'Shopping',
  'Transport',
  'Housing',
  'Utilities',
  'Health',
  'Entertainment',
  'Family & friends',
  'Salary',
  'Freelance',
  'Interest',
  'Other'
];

export function renderTransactionRows({
  transactions,
  accountId = 'all',
  accountName,
  money,
  escapeHtml,
  formatDate,
  emptyState
}) {
  const rows = transactions
    .filter(item => accountId === 'all' || item.accountId === accountId)
    .sort((left, right) => String(right.date).localeCompare(String(left.date)));

  if (!rows.length) {
    return `<tr><td colspan="4">${emptyState(
      'No transactions yet',
      'Use the buttons above to add Money In or Money Out.',
      'ph-arrows-left-right'
    )}</td></tr>`;
  }

  return rows.map(item => `
    <tr>
      <td>
        <strong>${escapeHtml(item.note || item.category || 'Entry')}</strong>
        <small>${escapeHtml(accountName(item.accountId))} · ${escapeHtml(item.category || 'Other')}</small>
      </td>
      <td>${formatDate(item.date)}</td>
      <td><span class="badge ${item.type === 'out' ? 'warn' : ''}">${item.type === 'in' ? 'Money In' : 'Money Out'}</span></td>
      <td class="cash-amount ${item.type === 'in' ? 'money-in' : 'money-out'}">${item.type === 'in' ? '+' : '−'} ${money(item.amount)}</td>
    </tr>`).join('');
}

export function renderTransactionsPage(context) {
  const rows = renderTransactionRows({
    transactions: context.transactions,
    accountName: context.accountName,
    money: context.money,
    escapeHtml: context.escapeHtml,
    formatDate: context.formatDate,
    emptyState: context.emptyState
  });

  const actions = `
    <button class="primary-button" data-action="new-transaction-in">
      <i class="ph ph-arrow-down-left"></i> Money In
    </button>
    <button class="secondary-button" data-action="new-transaction-out">
      <i class="ph ph-arrow-up-right"></i> Money Out
    </button>`;

  return context.pageHeader(
    'Transactions',
    'Record money movements and review your transaction history.',
    actions
  ) + `
    <section class="card cashflow-card">
      <div class="card-title">
        <div><h2>Transaction history</h2><p>Money In and Money Out entries</p></div>
      </div>
      <div class="cashflow-table-wrap">
        <table class="cashflow-table">
          <thead><tr><th>Description</th><th>Date</th><th>Type</th><th>Amount</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
}

export function transactionFormMarkup({ type, accounts, field, selectField, today }) {
  const accountOptions = accounts.map(account => [account.id, account.name]);
  const categoryOptions = TRANSACTION_CATEGORIES.map(category => [category, category]);

  return selectField('Account', 'accountId', accountOptions, accounts[0]?.id)
    + `<div class="field-grid">${field('Amount (VND)', 'amount', 'number', '', 'min="1" step="1" required')}${field('Date', 'date', 'date', today, 'required')}</div>`
    + selectField('Category', 'category', categoryOptions, type === 'in' ? 'Salary' : 'Other')
    + field('Description', 'note', 'text', '', 'maxlength="100"');
}

export function createTransaction(formData, type, createId) {
  const amount = Number(formData.get('amount'));
  const date = String(formData.get('date') || '').trim();
  const accountId = String(formData.get('accountId') || '').trim();

  if (!accountId) return { error: 'Choose an account.' };
  if (!(amount > 0)) return { error: 'Enter an amount greater than zero.' };
  if (!date) return { error: 'Choose a date.' };

  return {
    transaction: {
      id: createId(),
      type: type === 'in' ? 'in' : 'out',
      accountId,
      amount,
      date,
      category: String(formData.get('category') || 'Other'),
      note: String(formData.get('note') || '').trim()
    }
  };
}
