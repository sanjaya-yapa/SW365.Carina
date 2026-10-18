const paymentElement = (id) => document.getElementById(id);
let selectedPayment = null;
let paymentsRequest = 0;
let linkRequest = 0;
let paymentBusy = false;
function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function paymentMoney(value) {
  return `$${Number(value).toFixed(2)}`;
}
function paymentTotal(rows) {
  const cents = rows.reduce((sum, row) => {
    const [whole, fraction = ''] = String(row.amount).split('.');
    return sum + BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  }, 0n);
  return `$${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}
function paymentNode(tag, text, className = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
}
async function paymentApi(url, method = 'GET', body) {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Payment request failed');
  return result.data;
}
function paymentMessage(message, error = false) {
  paymentElement('paymentsStatus').textContent = message;
  paymentElement('paymentsStatus').className = error ? 'text-danger' : 'text-success';
}
function paymentButton(row) {
  const button = paymentNode(
    'button',
    `${row.name} · ${paymentMoney(row.amount)} · ${row.status.toLowerCase()}`,
    'btn btn-sm text-start w-100 mb-1 payment-' + row.status.toLowerCase()
  );
  button.type = 'button';
  button.addEventListener('click', () => openPayment(row));
  return button;
}
function renderPaymentAgenda(container, rows) {
  container.replaceChildren();
  if (!rows.length)
    container.appendChild(paymentNode('p', 'No payments in this period.', 'text-muted'));
  for (const row of rows) {
    const item = paymentNode('div', '');
    item.append(paymentNode('span', row.due_date + ' · '), paymentButton(row));
    container.appendChild(item);
  }
}
async function loadPayments() {
  const request = ++paymentsRequest;
  const month = paymentElement('paymentMonth').value;
  if (!/^\d{4}-\d{2}$/.test(month)) return;
  const [year, number] = month.split('-').map(Number);
  const days = new Date(year, number, 0).getDate();
  const today = localToday();
  const next = new Date(today + 'T00:00:00Z');
  next.setUTCDate(next.getUTCDate() + 6);
  const calendarUrl = (from, to) => `/api/payments/calendar?from=${from}&to=${to}&today=${today}`;
  paymentMessage('Loading payments...');
  paymentElement('paymentsResults').hidden = true;
  try {
    const [rows, upcoming, schedules] = await Promise.all([
      paymentApi(calendarUrl(month + '-01', month + '-' + days)),
      paymentApi(calendarUrl(today, next.toISOString().slice(0, 10))),
      paymentApi('/api/payments'),
    ]);
    if (request !== paymentsRequest) return;
    const unpaid = rows.filter((row) => ['UPCOMING', 'OVERDUE'].includes(row.status));
    paymentElement('paymentSummary').textContent =
      `${month}: expected ${paymentTotal(rows.filter((row) => row.status !== 'SKIPPED'))} · Still due ${paymentTotal(unpaid)} · Overdue ${paymentTotal(rows.filter((row) => row.status === 'OVERDUE'))}`;
    renderPaymentAgenda(
      paymentElement('upcomingPayments'),
      upcoming.filter((row) => row.status === 'UPCOMING')
    );
    renderPaymentAgenda(paymentElement('paymentAgenda'), rows);
    const calendar = paymentElement('paymentCalendar');
    calendar.replaceChildren();
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((day) =>
      calendar.appendChild(paymentNode('div', day, 'fw-bold p-2'))
    );
    const offset = (new Date(year, number - 1, 1).getDay() + 6) % 7;
    for (let i = 0; i < offset; i++)
      calendar.appendChild(paymentNode('div', '', 'payment-day bg-light'));
    for (let day = 1; day <= days; day++) {
      const date = month + '-' + String(day).padStart(2, '0');
      const cell = paymentNode('div', '', 'payment-day');
      cell.appendChild(paymentNode('div', String(day), 'fw-semibold mb-2'));
      rows
        .filter((row) => row.due_date === date)
        .forEach((row) => cell.appendChild(paymentButton(row)));
      calendar.appendChild(cell);
    }
    const list = paymentElement('scheduleList');
    list.replaceChildren();
    if (!schedules.length)
      list.appendChild(paymentNode('p', 'No schedules yet. Add your first payment above.'));
    for (const schedule of schedules) {
      const item = paymentNode('div', '', 'card card-body mb-2');
      item.appendChild(
        paymentNode(
          'p',
          `${schedule.name} · ${paymentMoney(schedule.amount)} · ${schedule.frequency.toLowerCase()} · ${schedule.account_name} / ${schedule.category_name} · From ${schedule.start_date}${schedule.end_date ? ' through ' + schedule.end_date : ''}`
        )
      );
      const form = document.createElement('form');
      form.className = 'd-flex flex-wrap gap-2 align-items-end';
      const label = paymentNode('label', 'Final due date (inclusive)');
      const input = document.createElement('input');
      input.type = 'date';
      input.required = true;
      input.min = schedule.start_date;
      input.max = '2100-12-31';
      input.className = 'form-control';
      input.value = schedule.end_date || today;
      label.appendChild(input);
      const save = paymentNode('button', 'Set end date', 'btn btn-outline-secondary');
      form.append(label, save);
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (paymentBusy || !form.reportValidity()) return;
        await paymentMutation(
          () =>
            paymentApi(`/api/payments/${schedule.schedule_id}/end`, 'PUT', {
              endDate: input.value,
            }),
          'Schedule end date saved.'
        );
      });
      item.appendChild(form);
      list.appendChild(item);
    }
    paymentElement('paymentsResults').hidden = false;
    paymentMessage('');
    return true;
  } catch (error) {
    if (request === paymentsRequest) paymentMessage(error.message, true);
    return false;
  }
}
async function openPayment(row) {
  if (paymentBusy) return;
  selectedPayment = row;
  paymentElement('occurrencePanel').hidden = false;
  paymentElement('occurrenceTitle').textContent =
    `${row.name} · ${row.due_date} · ${row.status.toLowerCase()}`;
  paymentElement('occurrenceDetails').textContent =
    `Expected ${paymentMoney(row.amount)} · ${row.account_name} / ${row.category_name}${row.transaction_id ? ` · Linked transaction #${row.transaction_id}, actual ${paymentMoney(row.actual_amount)}` : ''}`;
  paymentElement('linkMonth').value = row.due_date.slice(0, 7);
  paymentElement('skipPayment').disabled = row.status === 'PAID' || row.status === 'SKIPPED';
  paymentElement('resetPayment').disabled = !['PAID', 'SKIPPED'].includes(row.status);
  paymentElement('occurrenceTitle').focus();
  await loadLinkTransactions();
}
async function loadLinkTransactions() {
  const request = ++linkRequest;
  const row = selectedPayment;
  if (!row) return;
  const select = paymentElement('linkTransaction');
  select.replaceChildren();
  paymentElement('linkPayment').disabled = true;
  if (row.status === 'PAID') {
    paymentElement('linkStatus').textContent =
      'Undo paid to unlink this expense. The expense itself is retained.';
    return;
  }
  const [year, month] = paymentElement('linkMonth').value.split('-');
  paymentElement('linkStatus').textContent = 'Loading recorded expenses...';
  try {
    const transactions = await paymentApi(
      `/api/transactions?year=${year}&month=${Number(month)}&accountId=${row.account_id}&categoryId=${row.category_id}`
    );
    if (request !== linkRequest || selectedPayment !== row) return;
    const placeholder = paymentNode('option', 'Select a recorded expense');
    placeholder.value = '';
    select.appendChild(placeholder);
    for (const txn of transactions) {
      const option = paymentNode(
        'option',
        `${txn.txn_date} · ${paymentMoney(txn.amount)} · ${txn.note || 'Expense'} · #${txn.transaction_id}`
      );
      option.value = txn.transaction_id;
      select.appendChild(option);
    }
    paymentElement('linkStatus').textContent = transactions.length
      ? 'Choose the matching expense. A transaction can pay only one occurrence.'
      : 'No matching expenses. Record or complete the CSV import first, or choose another transaction month.';
    paymentElement('linkPayment').disabled = false;
  } catch (error) {
    if (request === linkRequest) paymentElement('linkStatus').textContent = error.message;
  }
}
async function paymentMutation(operation, message) {
  if (paymentBusy) return;
  paymentBusy = true;
  const controls = [...document.querySelectorAll('main button, main input, main select')].map(
    (control) => [control, control.disabled]
  );
  controls.forEach(([control]) => {
    control.disabled = true;
  });
  try {
    await operation();
    paymentElement('occurrencePanel').hidden = true;
    selectedPayment = null;
    linkRequest++;
    const refreshed = await loadPayments();
    if (refreshed) paymentMessage(message);
    else paymentMessage(`${message} Refresh failed; use Refresh to reload payments.`, true);
    return true;
  } catch (error) {
    paymentMessage(error.message, true);
    return false;
  } finally {
    paymentBusy = false;
    controls.forEach(([control, disabled]) => {
      control.disabled = disabled;
    });
  }
}
async function updatePayment(action) {
  if (!selectedPayment) return;
  const transactionId = paymentElement('linkTransaction').value;
  if (action === 'link' && !transactionId) {
    paymentElement('linkStatus').textContent = 'Select a transaction first.';
    return;
  }
  await paymentMutation(
    () =>
      paymentApi(
        `/api/payments/${selectedPayment.schedule_id}/occurrences/${selectedPayment.due_date}`,
        'PUT',
        { action, transactionId }
      ),
    'Payment updated.'
  );
}
document.addEventListener('DOMContentLoaded', async () => {
  paymentElement('paymentMonth').value = localToday().slice(0, 7);
  paymentElement('paymentStart').value = localToday();
  paymentElement('paymentFilters').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!paymentBusy) loadPayments();
  });
  paymentElement('linkMonth').addEventListener('change', loadLinkTransactions);
  for (const [id, action] of [
    ['linkPayment', 'link'],
    ['skipPayment', 'skip'],
    ['resetPayment', 'reset'],
  ])
    paymentElement(id).addEventListener('click', () => updatePayment(action));
  paymentElement('closeOccurrence').addEventListener('click', () => {
    selectedPayment = null;
    linkRequest++;
    paymentElement('occurrencePanel').hidden = true;
  });
  for (const view of ['calendar', 'agenda'])
    paymentElement(view + 'View').addEventListener('click', () => {
      paymentElement('paymentCalendarWrap').hidden = view !== 'calendar';
      paymentElement('paymentAgenda').hidden = view !== 'agenda';
      for (const name of ['calendar', 'agenda'])
        paymentElement(name + 'View').setAttribute('aria-pressed', String(name === view));
    });
  paymentElement('scheduleForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = {
      name: paymentElement('paymentName').value,
      amount: paymentElement('paymentAmount').value,
      accountId: paymentElement('paymentAccount').value,
      categoryId: paymentElement('paymentCategory').value,
      frequency: paymentElement('paymentFrequency').value,
      startDate: paymentElement('paymentStart').value,
      endDate: paymentElement('paymentEnd').value,
    };
    if (
      await paymentMutation(() => paymentApi('/api/payments', 'POST', body), 'Schedule created.')
    ) {
      paymentElement('scheduleForm').reset();
      paymentElement('paymentStart').value = localToday();
    }
  });
  try {
    const [accounts, categories] = await Promise.all([
      paymentApi('/api/accounts?status=active'),
      paymentApi('/api/categories?status=active'),
    ]);
    for (const [id, rows, key, label] of [
      ['paymentAccount', accounts, 'account_id', 'account_name'],
      [
        'paymentCategory',
        categories.filter((row) => row.category_type === 'EXPENSE'),
        'category_id',
        'category_name',
      ],
    ]) {
      const select = paymentElement(id);
      const placeholder = paymentNode('option', 'Select...');
      placeholder.value = '';
      select.appendChild(placeholder);
      rows.forEach((row) => {
        const option = paymentNode('option', row[label]);
        option.value = row[key];
        select.appendChild(option);
      });
    }
    await loadPayments();
  } catch (error) {
    paymentMessage(error.message, true);
  }
});
