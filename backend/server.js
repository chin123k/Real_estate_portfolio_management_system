require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/database');

const app = express();

// Middleware
app.use(cors());
// Increase body size limit to support base64 file uploads from frontend
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Test database connection
app.get('/api/test', async (req, res) => {
  try {
    const [result] = await db.query('SELECT 1 + 1 AS solution');
    res.json({ message: 'Database connected!', result: result[0].solution });
  } catch (error) {
    res.status(500).json({ message: 'Database connection failed', error: error.message });
  }
});

// Routes
app.use('/api/properties', require('./routes/properties'));
app.use('/api/tenants', require('./routes/tenants'));
app.use('/api/owners', require('./routes/owners'));
app.use('/api/leases', require('./routes/leases'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/insurance', require('./routes/insurance'));
app.use('/api/inspections', require('./routes/inspections'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/auth', require('./routes/auth'));

const PORT = process.env.PORT || 5000;

// Serve React app (SPA) in production and provide a catch-all for client routes
const clientBuildPath = path.join(__dirname, '..', 'frontend', 'build');
app.use(express.static(clientBuildPath));

// For any non-API route, send back index.html so React Router can handle it
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) next(err);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});