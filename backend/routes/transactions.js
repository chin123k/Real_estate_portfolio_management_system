const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ft.*, p.Property_Name, p.Street_Address
       FROM Financial_Transaction ft
       LEFT JOIN Property p ON ft.Property_ID = p.Property_ID
       ORDER BY ft.Transaction_Date DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get transactions by tenant
router.get('/tenant/:tenantId', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ft.*, p.Property_Name, p.Street_Address
       FROM Financial_Transaction ft
       JOIN Property p ON ft.Property_ID = p.Property_ID
       JOIN Lease l ON ft.Property_ID = l.Property_ID
       WHERE l.Tenant_ID = ? AND l.Status = 'Active'
       ORDER BY ft.Transaction_Date DESC`,
      [req.params.tenantId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching tenant transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get transactions by owner
router.get('/owner/:ownerId', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ft.*, p.Property_Name, p.Street_Address
       FROM Financial_Transaction ft
       JOIN Property p ON ft.Property_ID = p.Property_ID
       WHERE p.Owner_ID = ?
       ORDER BY ft.Transaction_Date DESC`,
      [req.params.ownerId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching owner transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get pending rent payments for a tenant
router.get('/pending/:tenantId', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, l.Monthly_Rent, prop.Property_Name, prop.Street_Address
       FROM Payment p
       JOIN Lease l ON p.Lease_ID = l.Lease_ID
       JOIN Property prop ON l.Property_ID = prop.Property_ID
       WHERE l.Tenant_ID = ? AND p.Status IN ('Pending', 'Late')
       ORDER BY p.Due_Date ASC`,
      [req.params.tenantId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ error: 'Failed to fetch pending payments' });
  }
});

// Get rent payment history for a tenant
router.get('/history/:tenantId', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, prop.Property_Name, prop.Street_Address
       FROM Payment p
       JOIN Lease l ON p.Lease_ID = l.Lease_ID
       JOIN Property prop ON l.Property_ID = prop.Property_ID
       WHERE l.Tenant_ID = ?
       ORDER BY p.Payment_Date DESC`,
      [req.params.tenantId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Record a rent payment
router.post('/pay', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      Payment_ID,
      Lease_ID,
      Amount,
      Payment_Method,
      Reference_Number
    } = req.body;

    const payment_date = new Date().toISOString().split('T')[0];

    // Update rent payment record
    await connection.query(
      `UPDATE Payment 
       SET Payment_Date = ?, Payment_Method = ?, Status = 'Paid'
       WHERE Payment_ID = ?`,
      [payment_date, Payment_Method, Payment_ID]
    );

    // Get property ID from lease
    const [lease] = await connection.query(
      'SELECT Property_ID FROM Lease WHERE Lease_ID = ?',
      [Lease_ID]
    );

    // Record financial transaction
    await connection.query(
      `INSERT INTO Financial_Transaction 
       (Property_ID, Transaction_Type, Amount, Transaction_Date, 
        Description, Category)
       VALUES (?, 'Income', ?, ?, 'Rent Payment', 'Rent')`,
      [lease[0].Property_ID, Amount, payment_date]
    );

    await connection.commit();
    res.json({ message: 'Payment recorded successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  } finally {
    connection.release();
  }
});

// Create new transaction
router.post('/', async (req, res) => {
  try {
    const {
      Property_ID,
      Transaction_Type,
      Amount,
      Transaction_Date,
      Description,
      Category
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO Financial_Transaction 
       (Property_ID, Transaction_Type, Amount, Transaction_Date, 
        Description, Category)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [Property_ID, Transaction_Type, Amount, Transaction_Date, 
       Description, Category]
    );

    res.status(201).json({
      message: 'Transaction created successfully',
      transactionId: result.insertId
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

module.exports = router;
