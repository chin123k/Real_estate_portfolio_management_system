const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all tenants
router.get('/', async (req, res) => {
  try {
    const [tenants] = await db.query('SELECT * FROM tenant');
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get tenants for a specific owner
// Includes: (a) tenants explicitly created/linked to this owner (t.Owner_ID)
//           (b) tenants who currently lease any property owned by this owner
router.get('/owner/:ownerId', async (req, res) => {
  try {
    const ownerId = req.params.ownerId;
    const [tenants] = await db.query(
      `SELECT 
         t.*, 
         COUNT(DISTINCT CASE WHEN l.Status IS NULL OR l.Status = 'Active' THEN l.Lease_ID END) AS Active_Leases,
         GROUP_CONCAT(DISTINCT CASE WHEN p.Property_ID IS NOT NULL THEN p.Property_Name END SEPARATOR ', ') AS Properties
       FROM tenant t
       LEFT JOIN lease l ON l.Tenant_ID = t.Tenant_ID
       LEFT JOIN property p ON p.Property_ID = l.Property_ID
       WHERE (t.Owner_ID = ? OR p.Owner_ID = ?)
       GROUP BY t.Tenant_ID
       ORDER BY t.Created_At DESC`,
      [ownerId, ownerId]
    );
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single tenant
router.get('/:id', async (req, res) => {
  try {
    const [tenant] = await db.query('SELECT * FROM tenant WHERE Tenant_ID = ?', [req.params.id]);
    if (tenant.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    res.json(tenant[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new tenant
router.post('/', async (req, res) => {
  const {
    First_Name,
    Last_Name,
    Email,
    Phone,
    Credit_Score,
    Employment_Status,
    Monthly_Income,
    Owner_ID
  } = req.body;

  try {
    const [result] = await db.query(
      'INSERT INTO tenant (First_Name, Last_Name, Email, Phone, Credit_Score, Employment_Status, Monthly_Income, Owner_ID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [First_Name, Last_Name, Email, Phone, Credit_Score, Employment_Status, Monthly_Income, Owner_ID || null]
    );
    res.status(201).json({ Tenant_ID: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a tenant
router.put('/:id', async (req, res) => {
  const {
    First_Name,
    Last_Name,
    Email,
    Phone,
    Credit_Score,
    Employment_Status,
    Monthly_Income,
    Owner_ID
  } = req.body;

  try {
    const [result] = await db.query(
      'UPDATE tenant SET First_Name = ?, Last_Name = ?, Email = ?, Phone = ?, Credit_Score = ?, Employment_Status = ?, Monthly_Income = ?, Owner_ID = COALESCE(?, Owner_ID) WHERE Tenant_ID = ?',
      [First_Name, Last_Name, Email, Phone, Credit_Score, Employment_Status, Monthly_Income, Owner_ID, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    res.json({ Tenant_ID: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a tenant
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM tenant WHERE Tenant_ID = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;