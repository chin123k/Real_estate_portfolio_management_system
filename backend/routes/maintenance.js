const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all maintenance requests (Owner view - all requests)
router.get('/owner', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT m.*, p.Property_Name, p.Street_Address, 
        CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
        t.Email as Tenant_Email, t.Phone as Tenant_Phone,
        CONCAT(o.First_Name, ' ', o.Last_Name) as Owner_Name
      FROM maintenance_request m
      JOIN property p ON m.Property_ID = p.Property_ID
      LEFT JOIN tenant t ON m.Tenant_ID = t.Tenant_ID
      LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID
      ORDER BY 
        CASE m.Status 
          WHEN 'Pending' THEN 1 
          WHEN 'In Progress' THEN 2 
          ELSE 3 
        END,
        CASE m.Priority 
          WHEN 'High' THEN 1 
          WHEN 'Medium' THEN 2 
          WHEN 'Low' THEN 3 
        END,
        m.Request_Date DESC
    `);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get maintenance requests for a specific owner
router.get('/owner/:ownerId', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT m.*, p.Property_Name, p.Street_Address, 
             CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
             t.Email as Tenant_Email, t.Phone as Tenant_Phone
  FROM maintenance_request m
  JOIN property p ON m.Property_ID = p.Property_ID
  LEFT JOIN tenant t ON m.Tenant_ID = t.Tenant_ID
  WHERE p.Owner_ID = ?
      ORDER BY 
        CASE m.Status 
          WHEN 'Pending' THEN 1 
          WHEN 'In Progress' THEN 2 
          ELSE 3 
        END,
        CASE m.Priority 
          WHEN 'High' THEN 1 
          WHEN 'Medium' THEN 2 
          WHEN 'Low' THEN 3 
        END,
        m.Request_Date DESC
    `, [req.params.ownerId]);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get maintenance requests for specific tenant (Tenant view)
router.get('/tenant/:tenantId', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT m.*, p.Property_Name, p.Street_Address 
      FROM maintenance_request m
      JOIN property p ON m.Property_ID = p.Property_ID
      WHERE m.Tenant_ID = ?
      ORDER BY m.Request_Date DESC
    `, [req.params.tenantId]);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all maintenance requests (Legacy - for compatibility)
router.get('/', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT m.*, p.Property_Name, CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name 
      FROM maintenance_request m
      JOIN property p ON m.Property_ID = p.Property_ID
      LEFT JOIN tenant t ON m.Tenant_ID = t.Tenant_ID
    `);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single maintenance request
router.get('/:id', async (req, res) => {
  try {
    const [request] = await db.query(`
      SELECT m.*, p.Property_Name, CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name 
      FROM maintenance_request m
      JOIN property p ON m.Property_ID = p.Property_ID
      LEFT JOIN tenant t ON m.Tenant_ID = t.Tenant_ID
      WHERE m.Request_ID = ?
    `, [req.params.id]);
    if (request.length === 0) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }
    res.json(request[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new maintenance request (Tenant action)
router.post('/', async (req, res) => {
  const {
    Property_ID,
    Tenant_ID,
    Description,
    Priority,
    Status,
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

    // Insert maintenance request with owner_id
    const [result] = await db.query(
  'INSERT INTO maintenance_request (Property_ID, Tenant_ID, Description, Priority, Status, Notes) VALUES (?, ?, ?, ?, ?, ?)',
  [Property_ID, Tenant_ID, Description, Priority || 'Medium', Status || 'Pending', Notes]
    );

    // Create notification for owner if owner exists
    if (Owner_ID) {
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
         VALUES ('Owner', ?, 'New Maintenance Request', ?, 'maintenance', ?)`,
        [Owner_ID, `${tenantName} reported a ${Priority || 'Medium'} priority maintenance issue at ${Property_Name}: ${Description.substring(0, 100)}`, result.insertId]
      );
    }

    res.status(201).json({ Request_ID: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a maintenance request (Owner action)
router.put('/:id', async (req, res) => {
  const {
    Property_ID,
    Tenant_ID,
    Description,
    Priority,
    Status,
    Completion_Date,
    Cost,
    Assigned_To,
    Notes
  } = req.body;

  try {
    // Get old request data
    const [oldRequest] = await db.query(
  'SELECT Status, Tenant_ID FROM maintenance_request WHERE Request_ID = ?',
      [req.params.id]
    );

    if (oldRequest.length === 0) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }

    // Update the request
    const [result] = await db.query(
      `UPDATE maintenance_request 
       SET Property_ID = ?, Tenant_ID = ?, Description = ?, Priority = ?, 
           Status = ?, Completion_Date = ?, Cost = ?, Assigned_To = ?, Notes = ? 
       WHERE Request_ID = ?`,
      [Property_ID, Tenant_ID, Description, Priority, Status, Completion_Date, Cost, Assigned_To, Notes, req.params.id]
    );

    // If status changed, notify tenant
    if (oldRequest[0].Status !== Status && Tenant_ID) {
      await db.query(
        `INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
         VALUES ('Tenant', ?, 'Maintenance Request Updated', ?, 'maintenance', ?)`,
        [Tenant_ID, `Your maintenance request status has been updated to: ${Status}`, req.params.id]
      );
    }

    res.json({ Request_ID: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a maintenance request
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM maintenance_request WHERE Request_ID = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }
    res.json({ message: 'Maintenance request deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
