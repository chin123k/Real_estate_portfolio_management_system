const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/owners
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Owner ORDER BY Created_At DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/owners
router.post('/', async (req, res) => {
  const { First_Name, Last_Name, Email, Phone } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO Owner (First_Name, Last_Name, Email, Phone) VALUES (?, ?, ?, ?)',
      [First_Name, Last_Name, Email, Phone]
    );
    res.status(201).json({ Owner_ID: result.insertId, First_Name, Last_Name, Email, Phone });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
