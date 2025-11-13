const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcrypt');

// Tenant login
router.post('/tenant/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find tenant by email
    const [tenants] = await db.query(
      'SELECT * FROM Tenant WHERE Email = ?',
      [email]
    );

    if (tenants.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tenant = tenants[0];

    // For now, if password is null in DB, allow any password (you should hash passwords properly)
    if (tenant.Password) {
      const isValidPassword = await bcrypt.compare(password, tenant.Password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    // Don't send password back
    delete tenant.Password;

    // In production, create JWT token here
    res.json({
      message: 'Login successful',
      userType: 'tenant',
      user: tenant
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Owner login
router.post('/owner/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find owner by email
    const [owners] = await db.query(
      'SELECT * FROM Owner WHERE Email = ?',
      [email]
    );

    if (owners.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const owner = owners[0];

    // Check password
    if (owner.Password) {
      const isValidPassword = await bcrypt.compare(password, owner.Password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    // Don't send password back
    delete owner.Password;

    res.json({
      message: 'Login successful',
      userType: 'owner',
      user: owner
    });
  } catch (error) {
    console.error('Error during owner login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Tenant registration
router.post('/tenant/register', async (req, res) => {
  try {
    const {
      First_Name,
      Last_Name,
      Email,
      Password,
      Phone,
      Credit_Score,
      Employment_Status,
      Monthly_Income,
      Owner_Email
    } = req.body;

    // Check if email already exists in Tenant or Owner table
    const [existingTenant] = await db.query('SELECT * FROM Tenant WHERE Email = ?', [Email]);
    const [existingOwner] = await db.query('SELECT * FROM Owner WHERE Email = ?', [Email]);
    
    if (existingTenant.length > 0 || existingOwner.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // If Owner_Email is provided, find the owner
    let Owner_ID = null;
    if (Owner_Email) {
      const [ownerData] = await db.query('SELECT Owner_ID FROM Owner WHERE Email = ?', [Owner_Email]);
      if (ownerData.length > 0) {
        Owner_ID = ownerData[0].Owner_ID;
      } else {
        return res.status(404).json({ error: 'Owner not found with this email' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(Password, 10);

    // Insert new tenant with Owner_ID
    const [result] = await db.query(
      `INSERT INTO Tenant (First_Name, Last_Name, Email, Password, Phone, Credit_Score, Employment_Status, Monthly_Income, Owner_ID)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [First_Name, Last_Name, Email, hashedPassword, Phone, Credit_Score, Employment_Status, Monthly_Income, Owner_ID]
    );

    res.status(201).json({
      message: 'Tenant registration successful',
      userType: 'tenant',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Error during tenant registration:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Owner registration
router.post('/owner/register', async (req, res) => {
  try {
    const {
      First_Name,
      Last_Name,
      Email,
      Password,
      Phone
    } = req.body;

    // Check if email already exists in Tenant or Owner table
    const [existingTenant] = await db.query('SELECT * FROM Tenant WHERE Email = ?', [Email]);
    const [existingOwner] = await db.query('SELECT * FROM Owner WHERE Email = ?', [Email]);
    
    if (existingTenant.length > 0 || existingOwner.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(Password, 10);

    // Insert new owner
    const [result] = await db.query(
      `INSERT INTO Owner (First_Name, Last_Name, Email, Password, Phone)
       VALUES (?, ?, ?, ?, ?)`,
      [First_Name, Last_Name, Email, hashedPassword, Phone]
    );

    res.status(201).json({
      message: 'Owner registration successful',
      userType: 'owner',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Error during owner registration:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Get tenant profile
router.get('/tenant/profile/:tenantId', async (req, res) => {
  try {
    const [tenants] = await db.query(
      'SELECT Tenant_ID, First_Name, Last_Name, Email, Phone, Credit_Score, Employment_Status, Monthly_Income FROM Tenant WHERE Tenant_ID = ?',
      [req.params.tenantId]
    );

    if (tenants.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(tenants[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get owner profile
router.get('/owner/profile/:ownerId', async (req, res) => {
  try {
    const [owners] = await db.query(
      'SELECT Owner_ID, First_Name, Last_Name, Email, Phone FROM Owner WHERE Owner_ID = ?',
      [req.params.ownerId]
    );

    if (owners.length === 0) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    res.json(owners[0]);
  } catch (error) {
    console.error('Error fetching owner profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update tenant profile
router.put('/tenant/profile/:tenantId', async (req, res) => {
  try {
    const { Phone, Employment_Status, Monthly_Income } = req.body;

    const [result] = await db.query(
      `UPDATE Tenant 
       SET Phone = ?, Employment_Status = ?, Monthly_Income = ?
       WHERE Tenant_ID = ?`,
      [Phone, Employment_Status, Monthly_Income, req.params.tenantId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update owner profile
router.put('/owner/profile/:ownerId', async (req, res) => {
  try {
    const { Phone } = req.body;

    const [result] = await db.query(
      `UPDATE Owner 
       SET Phone = ?
       WHERE Owner_ID = ?`,
      [Phone, req.params.ownerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating owner profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
