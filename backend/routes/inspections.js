const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all inspection requests (Owner view)
router.get('/owner', async (req, res) => {
  try {
    const [inspections] = await db.query(`
      SELECT i.*, p.Property_Name, p.Street_Address,
             CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
             t.Email as Tenant_Email, t.Phone as Tenant_Phone
      FROM property_inspection i
      JOIN property p ON i.Property_ID = p.Property_ID
      LEFT JOIN tenant t ON i.Tenant_ID = t.Tenant_ID
      ORDER BY 
        CASE i.Status 
          WHEN 'Scheduled' THEN 1 
          WHEN 'Pending' THEN 2 
          WHEN 'Completed' THEN 3 
          ELSE 4 
        END,
        i.Inspection_Date DESC
    `);
    res.json(inspections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get inspections for a specific owner
router.get('/owner/:ownerId', async (req, res) => {
  try {
    const [inspections] = await db.query(`
      SELECT i.*, p.Property_Name, p.Street_Address,
             CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
             t.Email as Tenant_Email, t.Phone as Tenant_Phone
      FROM property_inspection i
      JOIN property p ON i.Property_ID = p.Property_ID
      LEFT JOIN tenant t ON i.Tenant_ID = t.Tenant_ID
      WHERE p.Owner_ID = ?
      ORDER BY 
        CASE i.Status 
          WHEN 'Scheduled' THEN 1 
          WHEN 'Pending' THEN 2 
          WHEN 'Completed' THEN 3 
          ELSE 4 
        END,
        i.Inspection_Date DESC
    `, [req.params.ownerId]);
    res.json(inspections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get inspections for specific tenant (Tenant view)
router.get('/tenant/:tenantId', async (req, res) => {
  try {
    const [inspections] = await db.query(`
      SELECT i.*, p.Property_Name, p.Street_Address 
      FROM property_inspection i
      JOIN property p ON i.Property_ID = p.Property_ID
      WHERE i.Tenant_ID = ?
      ORDER BY i.Inspection_Date DESC
    `, [req.params.tenantId]);
    res.json(inspections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all inspections (Legacy - for compatibility)
router.get('/', async (req, res) => {
  try {
    const [inspections] = await db.query(`
      SELECT i.*, p.Property_Name, 
             CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name 
      FROM property_inspection i
      JOIN property p ON i.Property_ID = p.Property_ID
      LEFT JOIN tenant t ON i.Tenant_ID = t.Tenant_ID
    `);
    res.json(inspections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single inspection
router.get('/:id', async (req, res) => {
  try {
    const [inspection] = await db.query(`
      SELECT i.*, p.Property_Name, p.Owner_ID,
             CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name 
      FROM property_inspection i
      JOIN property p ON i.Property_ID = p.Property_ID
      LEFT JOIN tenant t ON i.Tenant_ID = t.Tenant_ID
      WHERE i.Inspection_ID = ?
    `, [req.params.id]);
    if (inspection.length === 0) {
      return res.status(404).json({ message: 'Inspection not found' });
    }
    res.json(inspection[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new inspection request (Tenant or Owner action)
router.post('/', async (req, res) => {
  const {
    Property_ID,
    Tenant_ID,
    Inspection_Date,
    Inspector_Name,
    Inspection_Type,
    Results,
    Status,
    Request_Type,
    Notes
  } = req.body;

  try {
    // Get property owner
    const [propertyData] = await db.query(
      'SELECT Owner_ID, Property_Name FROM property WHERE Property_ID = ?',
      [Property_ID]
    );

    if (propertyData.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const Owner_ID = propertyData[0].Owner_ID;
    const Property_Name = propertyData[0].Property_Name;

    // Insert inspection request
    const [result] = await db.query(
      `INSERT INTO property_inspection 
       (Property_ID, Tenant_ID, Inspection_Date, Inspector_Name, Inspection_Type, 
        Results, Status, Request_Type, Notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [Property_ID, Tenant_ID, Inspection_Date, Inspector_Name, Inspection_Type, 
       Results, Status || 'Pending', Request_Type || 'Owner Initiated', Notes]
    );

    // Create notification for owner if tenant requested
    if (Tenant_ID && Request_Type === 'Tenant Requested' && Owner_ID) {
      // Get tenant name
      const [tenantData] = await db.query(
        'SELECT First_Name, Last_Name FROM tenant WHERE Tenant_ID = ?',
        [Tenant_ID]
      );
      
      const tenantName = tenantData.length > 0 
        ? `${tenantData[0].First_Name} ${tenantData[0].Last_Name}`
        : 'A tenant';

      await db.query(
        `INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
         VALUES ('Owner', ?, 'New Inspection Request', ?, 'inspection', ?)`,
        [Owner_ID, `${tenantName} requested an inspection for ${Property_Name} (${Inspection_Type}) on ${Inspection_Date}`, result.insertId]
      );
    }

    res.status(201).json({ Inspection_ID: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update an inspection (Owner action)
router.put('/:id', async (req, res) => {
  try {
    // Fetch current inspection row for safe partial update
    const [rows] = await db.query(
      'SELECT * FROM property_inspection WHERE Inspection_ID = ?',
      [req.params.id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Inspection not found' });
    }

    const current = rows[0];

    const newVals = {
      Property_ID: req.body.Property_ID ?? current.Property_ID,
      Tenant_ID: req.body.Tenant_ID ?? current.Tenant_ID,
      Inspection_Date: req.body.Inspection_Date ?? current.Inspection_Date,
      Inspector_Name: req.body.Inspector_Name ?? current.Inspector_Name,
      Inspection_Type: req.body.Inspection_Type ?? current.Inspection_Type,
      Results: req.body.Results ?? current.Results,
      Status: req.body.Status ?? current.Status,
      Request_Type: req.body.Request_Type ?? current.Request_Type,
      Notes: req.body.Notes ?? current.Notes,
    };

    // Perform update with fully populated values to satisfy NOT NULL constraints
    await db.query(
      `UPDATE property_inspection 
       SET Property_ID = ?, Tenant_ID = ?, Inspection_Date = ?, Inspector_Name = ?, 
           Inspection_Type = ?, Results = ?, Status = ?, Request_Type = ?, Notes = ?
       WHERE Inspection_ID = ?`,
      [
        newVals.Property_ID,
        newVals.Tenant_ID,
        newVals.Inspection_Date,
        newVals.Inspector_Name,
        newVals.Inspection_Type,
        newVals.Results,
        newVals.Status,
        newVals.Request_Type,
        newVals.Notes,
        req.params.id,
      ]
    );

    // If status changed, notify tenant
    if (current.Status !== newVals.Status && newVals.Tenant_ID) {
      await db.query(
        `INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
         VALUES ('Tenant', ?, 'Inspection Request Updated', ?, 'inspection', ?)`,
        [newVals.Tenant_ID, `Your inspection request status has been updated to: ${newVals.Status}`, req.params.id]
      );
    }

    res.json({ Inspection_ID: req.params.id, ...newVals });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Status-only quick update (minimal payload)
router.put('/:id/status', async (req, res) => {
  const { Status } = req.body;
  if (!Status) return res.status(400).json({ message: 'Status is required' });
  try {
    const [rows] = await db.query(
      'SELECT Tenant_ID, Status FROM property_inspection WHERE Inspection_ID = ?',
      [req.params.id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Inspection not found' });
    }

    const prev = rows[0];

    await db.query(
      `UPDATE property_inspection SET Status = ?, Updated_At = CURRENT_TIMESTAMP WHERE Inspection_ID = ?`,
      [Status, req.params.id]
    );

    if (prev.Status !== Status && prev.Tenant_ID) {
      await db.query(
        `INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
         VALUES ('Tenant', ?, 'Inspection Request Updated', ?, 'inspection', ?)`
        , [prev.Tenant_ID, `Your inspection request status has been updated to: ${Status}`, req.params.id]
      );
    }

    res.json({ Inspection_ID: req.params.id, Status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete an inspection
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM property_inspection WHERE Inspection_ID = ?', 
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Inspection not found' });
    }
    res.json({ message: 'Inspection deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
