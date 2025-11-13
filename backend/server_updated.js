const express = require('express');
const cors = require('cors');
const app = express();
const port = 5000;

const db = require('./config/database');

// Enable CORS for frontend
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Import routes
const propertyRoutes = require('./routes/properties');
const tenantRoutes = require('./routes/tenants');
const leaseRoutes = require('./routes/leases');
const maintenanceRoutes = require('./routes/maintenance');
const transactionRoutes = require('./routes/transactions');
const ownerRoutes = require('./routes/owners');
const insuranceRoutes = require('./routes/insurance');
const documentRoutes = require('./routes/documents');
const inspectionRoutes = require('./routes/inspections');
const paymentRoutes = require('./routes/payments');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Use routes
app.use('/api/properties', propertyRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/leases', leaseRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/owners', ownerRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/inspections', inspectionRoutes);
// Payments APIs (tenant submits payment, owner confirms, lists, etc.)
app.use('/api/payments', paymentRoutes);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
