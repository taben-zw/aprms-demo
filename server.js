const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dataDir = path.join(__dirname, 'data');
const transactionsFile = path.join(dataDir, 'transactions.json');

const vehicleRegistry = {
  'ABC1234': { plate: 'ABC1234', owner: 'John Dube', type: 'Small Vehicle' },
  'BCD2345': { plate: 'BCD2345', owner: 'Mandla Ncube', type: 'Combi' },
  'CDE3456': { plate: 'CDE3456', owner: 'Sarah Moyo', type: 'Sprinter' },
  'DEF4567': { plate: 'DEF4567', owner: 'Tinashe Sibanda', type: 'Mini Bus' },
  'EFG5678': { plate: 'EFG5678', owner: 'Metro Coach', type: 'Bus' }
};

const tariffs = {
  'Small Vehicle': 1,
  'Combi': 2,
  'Sprinter': 4,
  'Mini Bus': 5,
  'Bus': 10
};

function ensureTransactionsFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(transactionsFile)) {
    fs.writeFileSync(transactionsFile, JSON.stringify([], null, 2));
  }
}

function readTransactions() {
  ensureTransactionsFile();
  return JSON.parse(fs.readFileSync(transactionsFile, 'utf8'));
}

function writeTransactions(transactions) {
  fs.writeFileSync(transactionsFile, JSON.stringify(transactions, null, 2));
}

function sanitizePlate(plate) {
  return String(plate || '').replace(/\s+/g, '').toUpperCase();
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', system: 'APRMS Demo' });
});

app.get('/api/vehicles/:plate', (req, res) => {
  const plate = sanitizePlate(req.params.plate);
  const vehicle = vehicleRegistry[plate];

  if (!vehicle) {
    return res.status(404).json({ message: 'Vehicle not found in CVR mock database.' });
  }

  const fee = tariffs[vehicle.type] || 0;
  res.json({ ...vehicle, fee });
});

app.post('/api/scan', (req, res) => {
  const plate = sanitizePlate(req.body.plate);
  const vehicle = vehicleRegistry[plate];

  if (!vehicle) {
    return res.status(404).json({ message: 'ANPR scan failed or vehicle not found in CVR.' });
  }

  const fee = tariffs[vehicle.type] || 0;
  const invoice = {
    invoiceId: `INV-${Date.now()}`,
    plate: vehicle.plate,
    owner: vehicle.owner,
    type: vehicle.type,
    fee,
    status: 'PENDING',
    scannedAt: new Date().toISOString()
  };

  res.json(invoice);
});

app.post('/api/pay', (req, res) => {
  const { invoiceId, plate, type, fee, paymentMethod } = req.body;
  const cleanPlate = sanitizePlate(plate);

  if (!invoiceId || !cleanPlate || !type || !fee || !paymentMethod) {
    return res.status(400).json({ message: 'Missing required payment fields.' });
  }

  const transactions = readTransactions();
  const transaction = {
    transactionId: `TXN-${Date.now()}`,
    invoiceId,
    plate: cleanPlate,
    type,
    fee: Number(fee),
    paymentMethod,
    gateStatus: 'OPEN',
    paidAt: new Date().toISOString()
  };

  transactions.push(transaction);
  writeTransactions(transactions);

  res.json({
    message: 'Payment successful. Gate opened.',
    receipt: transaction
  });
});

app.get('/api/dashboard', (req, res) => {
  const transactions = readTransactions();
  const totalRevenue = transactions.reduce((sum, tx) => sum + Number(tx.fee || 0), 0);
  const vehicleCount = transactions.length;

  const byType = transactions.reduce((acc, tx) => {
    acc[tx.type] = (acc[tx.type] || 0) + 1;
    return acc;
  }, {});

  res.json({
    totalRevenue,
    vehicleCount,
    transactions,
    byType
  });
});

app.post('/api/reset', (req, res) => {
  writeTransactions([]);
  res.json({ message: 'Demo transactions cleared.' });
});

app.listen(PORT, () => {
  ensureTransactionsFile();
  console.log(`APRMS demo running on http://localhost:${PORT}`);
});
