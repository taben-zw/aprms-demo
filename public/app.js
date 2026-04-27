const scanForm = document.getElementById('scanForm');
const plateInput = document.getElementById('plate');
const invoiceCard = document.getElementById('invoiceCard');
const invoiceDetails = document.getElementById('invoiceDetails');
const receiptCard = document.getElementById('receiptCard');
const receiptEl = document.getElementById('receipt');
const payBtn = document.getElementById('payBtn');
const refreshBtn = document.getElementById('refreshBtn');
const resetBtn = document.getElementById('resetBtn');
const stats = document.getElementById('stats');
const transactionsTable = document.getElementById('transactionsTable');

let currentInvoice = null;

scanForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const plate = plateInput.value.trim();

  const response = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plate })
  });

  const data = await response.json();

  if (!response.ok) {
    alert(data.message || 'Scan failed');
    return;
  }

  currentInvoice = data;
  invoiceDetails.innerHTML = `
    <p><strong>Invoice ID:</strong> ${data.invoiceId}</p>
    <p><strong>Plate:</strong> ${data.plate}</p>
    <p><strong>Owner:</strong> ${data.owner}</p>
    <p><strong>Vehicle Type:</strong> ${data.type}</p>
    <p><strong>Parking Fee:</strong> $${data.fee}</p>
    <p><strong>Status:</strong> ${data.status}</p>
  `;
  invoiceCard.hidden = false;
});

payBtn.addEventListener('click', async () => {
  if (!currentInvoice) return;

  const response = await fetch('/api/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoiceId: currentInvoice.invoiceId,
      plate: currentInvoice.plate,
      type: currentInvoice.type,
      fee: currentInvoice.fee,
      paymentMethod: 'Tap Card'
    })
  });

  const data = await response.json();

  if (!response.ok) {
    alert(data.message || 'Payment failed');
    return;
  }

  receiptEl.textContent = JSON.stringify(data.receipt, null, 2);
  receiptCard.hidden = false;
  currentInvoice = null;
  invoiceCard.hidden = true;
  plateInput.value = '';
  loadDashboard();
});

refreshBtn.addEventListener('click', loadDashboard);

resetBtn.addEventListener('click', async () => {
  await fetch('/api/reset', { method: 'POST' });
  receiptCard.hidden = true;
  invoiceCard.hidden = true;
  currentInvoice = null;
  loadDashboard();
});

async function loadDashboard() {
  const response = await fetch('/api/dashboard');
  const data = await response.json();

  stats.innerHTML = `
    <div class="stat-box"><strong>Total Revenue</strong><br>$${data.totalRevenue}</div>
    <div class="stat-box"><strong>Vehicles Processed</strong><br>${data.vehicleCount}</div>
    <div class="stat-box"><strong>Control</strong><br>Cashless payment</div>
    <div class="stat-box"><strong>Monitoring</strong><br>Real-time dashboard</div>
  `;

  transactionsTable.innerHTML = data.transactions
    .map(tx => `
      <tr>
        <td>${tx.transactionId}</td>
        <td>${tx.plate}</td>
        <td>${tx.type}</td>
        <td>${tx.fee}</td>
        <td>${tx.paymentMethod}</td>
        <td>${tx.gateStatus}</td>
        <td>${new Date(tx.paidAt).toLocaleString()}</td>
      </tr>
    `)
    .join('');
}

loadDashboard();
