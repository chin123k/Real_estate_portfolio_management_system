const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all leases
router.get('/', async (req, res) => {
  try {
    const [leases] = await db.query(`
      SELECT l.*, p.Property_Name, p.Street_Address,
             CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
             CONCAT(o.First_Name, ' ', o.Last_Name) as Owner_Name
      FROM lease l
      JOIN property p ON l.Property_ID = p.Property_ID
      JOIN tenant t ON l.Tenant_ID = t.Tenant_ID
      LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID
    `);
    res.json(leases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get leases for a specific owner
router.get('/owner/:ownerId', async (req, res) => {
  try {
    const [leases] = await db.query(`
      SELECT l.*, p.Property_Name, p.Street_Address,
             CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
             t.Email as Tenant_Email, t.Phone as Tenant_Phone
      FROM lease l
      JOIN property p ON l.Property_ID = p.Property_ID
      JOIN tenant t ON l.Tenant_ID = t.Tenant_ID
      WHERE p.Owner_ID = ?
    `, [req.params.ownerId]);
    res.json(leases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get leases for a specific tenant
router.get('/tenant/:tenantId', async (req, res) => {
  try {
    const [leases] = await db.query(`
      SELECT l.*, p.Property_Name, p.Street_Address, p.City, p.State,
             CONCAT(o.First_Name, ' ', o.Last_Name) as Owner_Name
      FROM lease l
      JOIN property p ON l.Property_ID = p.Property_ID
      LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID
      WHERE l.Tenant_ID = ?
    `, [req.params.tenantId]);
    res.json(leases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all lease requests
router.get('/requests', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT lr.*, p.Property_Name, p.Street_Address, p.Current_Value,
             CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
             t.Email as Tenant_Email, t.Phone as Tenant_Phone
      FROM leaserequest lr
      JOIN property p ON lr.Property_ID = p.Property_ID
      JOIN tenant t ON lr.Tenant_ID = t.Tenant_ID
      ORDER BY lr.Created_At DESC
    `);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get lease requests for a specific owner
router.get('/requests/owner/:ownerId', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT lr.*, p.Property_Name, p.Street_Address, p.Current_Value,
             CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
             t.Email as Tenant_Email, t.Phone as Tenant_Phone
      FROM leaserequest lr
      JOIN property p ON lr.Property_ID = p.Property_ID
      JOIN tenant t ON lr.Tenant_ID = t.Tenant_ID
      WHERE p.Owner_ID = ? AND lr.Status = 'Pending'
      ORDER BY lr.Created_At DESC
    `, [req.params.ownerId]);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get lease requests for a specific tenant
router.get('/requests/tenant/:tenantId', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT lr.*, p.Property_Name, p.Street_Address, p.Current_Value
      FROM leaserequest lr
      JOIN property p ON lr.Property_ID = p.Property_ID
      WHERE lr.Tenant_ID = ?
      ORDER BY lr.Created_At DESC
    `, [req.params.tenantId]);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single lease
router.get('/:id', async (req, res) => {
  try {
    const [lease] = await db.query(`
      SELECT l.*, p.Property_Name, p.Street_Address,
             CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
             CONCAT(o.First_Name, ' ', o.Last_Name) as Owner_Name
      FROM lease l
      JOIN property p ON l.Property_ID = p.Property_ID
      JOIN tenant t ON l.Tenant_ID = t.Tenant_ID
      LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID
      WHERE l.Lease_ID = ?
    `, [req.params.id]);
    if (lease.length === 0) {
      return res.status(404).json({ message: 'Lease not found' });
    }
    res.json(lease[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new lease (Direct - Owner action)
router.post('/', async (req, res) => {
  const {
    Property_ID,
    Tenant_ID,
    Start_Date,
    End_Date,
    Monthly_Rent,
    Security_Deposit,
    Lease_Terms,
    Status
  } = req.body;

  try {
    const [result] = await db.query(
      'INSERT INTO lease (Property_ID, Tenant_ID, Start_Date, End_Date, Monthly_Rent, Security_Deposit, Lease_Terms, Status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [Property_ID, Tenant_ID, Start_Date, End_Date, Monthly_Rent, Security_Deposit, Lease_Terms, Status || 'Active']
    );

    // Update property status to Leased
    await db.query(
      'UPDATE property SET Status = ? WHERE Property_ID = ?',
      ['Leased', Property_ID]
    );

    // Create ownership record
    await db.query(
      `INSERT INTO propertyownership 
       (Property_ID, Tenant_ID, Ownership_Type, Start_Date, Status) 
       VALUES (?, ?, 'Leased', ?, 'Active')`,
      [Property_ID, Tenant_ID, Start_Date]
    );

    res.status(201).json({ Lease_ID: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new lease request (Tenant action)
router.post('/request', async (req, res) => {
  const {
    Property_ID,
    Tenant_ID,
    Requested_Start_Date,
    Requested_End_Date,
    Monthly_Rent,
    Message
  } = req.body;

  try {
    // Get property details
    const [propertyData] = await db.query(
      'SELECT Owner_ID, Property_Name, Status FROM property WHERE Property_ID = ?',
      [Property_ID]
    );

    if (propertyData.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (propertyData[0].Status !== 'Available') {
      return res.status(400).json({ message: 'Property is not available for lease' });
    }

    const Owner_ID = propertyData[0].Owner_ID;
    const Property_Name = propertyData[0].Property_Name;

    // Insert lease request
    const [result] = await db.query(
      `INSERT INTO leaserequest 
       (Property_ID, Tenant_ID, Requested_Start_Date, Requested_End_Date, Monthly_Rent, Message) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [Property_ID, Tenant_ID, Requested_Start_Date, Requested_End_Date, Monthly_Rent, Message]
    );

    // Create notification for owner
    if (Owner_ID) {
      const [tenantData] = await db.query(
        'SELECT First_Name, Last_Name FROM tenant WHERE Tenant_ID = ?',
        [Tenant_ID]
      );
      
      const tenantName = tenantData.length > 0 
        ? `${tenantData[0].First_Name} ${tenantData[0].Last_Name}`
        : 'A tenant';

      await db.query(
        `INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
         VALUES ('Owner', ?, 'New Lease Request', ?, 'lease', ?)`,
        [Owner_ID, `${tenantName} requested to lease ${Property_Name} for $${Monthly_Rent}/month`, result.insertId]
      );
    }

    // DEMO: Auto-approve if requested via query or env
    const autoApprove = String(req.query.autoApprove || '').toLowerCase() === '1' 
                      || String(req.query.autoApprove || '').toLowerCase() === 'true'
                      || String(process.env.DEMO_AUTO_APPROVE || '').toLowerCase() === 'true';

    if (autoApprove) {
      try {
        // Mark request approved
        await db.query(
          'UPDATE leaserequest SET Status = ?, Owner_Response = ? WHERE Request_ID = ?',
          ['Approved', 'Auto-approved (Demo)', result.insertId]
        );

        // Create actual lease
        await db.query(
          `INSERT INTO lease 
           (Property_ID, Tenant_ID, Start_Date, End_Date, Monthly_Rent, Status) 
           VALUES (?, ?, ?, ?, ?, 'Active')`,
          [Property_ID, Tenant_ID, Requested_Start_Date, Requested_End_Date, Monthly_Rent]
        );

        // Update property status to Leased (removes from Browse)
        await db.query('UPDATE property SET Status = ? WHERE Property_ID = ?', ['Leased', Property_ID]);

        // Record ownership if table exists
        try {
          await db.query(
            `INSERT INTO propertyownership 
             (Property_ID, Tenant_ID, Ownership_Type, Start_Date, Status) 
             VALUES (?, ?, 'Leased', ?, 'Active')`,
            [Property_ID, Tenant_ID, Requested_Start_Date]
          );
        } catch (e) {
          // ignore if table missing
        }

        // Notify tenant
        try {
          await db.query(
            `INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
             VALUES ('Tenant', ?, 'Lease Request Approved', ?, 'lease', ?)` ,
            [Tenant_ID, `Your lease request for ${Property_Name} has been auto-approved.`, result.insertId]
          );
        } catch (e) {
          // ignore notification failures in demo
        }

        return res.status(201).json({ Request_ID: result.insertId, autoApproved: true, ...req.body });
      } catch (autoErr) {
        // If auto-approve fails, still return the created request
        return res.status(201).json({ Request_ID: result.insertId, autoApproved: false, ...req.body });
      }
    }

    res.status(201).json({ Request_ID: result.insertId, autoApproved: false, ...req.body });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve or reject lease request (Owner action)
router.put('/request/:id', async (req, res) => {
  const { Status, Owner_Response } = req.body;

  try {
    // Get lease request details
    const [requestData] = await db.query(
      `SELECT lr.*, p.Owner_ID 
       FROM leaserequest lr
       JOIN property p ON lr.Property_ID = p.Property_ID
       WHERE lr.Request_ID = ?`,
      [req.params.id]
    );

    if (requestData.length === 0) {
      return res.status(404).json({ message: 'Lease request not found' });
    }

    const request = requestData[0];

    // Update lease request status
    await db.query(
      'UPDATE leaserequest SET Status = ?, Owner_Response = ? WHERE Request_ID = ?',
      [Status, Owner_Response, req.params.id]
    );

    // If approved, create actual lease and update property status
    if (Status === 'Approved') {
      const [leaseResult] = await db.query(
        `INSERT INTO lease 
         (Property_ID, Tenant_ID, Start_Date, End_Date, Monthly_Rent, Status) 
         VALUES (?, ?, ?, ?, ?, 'Active')`,
        [request.Property_ID, request.Tenant_ID, request.Requested_Start_Date, 
         request.Requested_End_Date, request.Monthly_Rent]
      );

      // Update property status to Leased
      await db.query(
        'UPDATE property SET Status = ? WHERE Property_ID = ?',
        ['Leased', request.Property_ID]
      );

      // Create ownership record
      await db.query(
        `INSERT INTO propertyownership 
         (Property_ID, Tenant_ID, Ownership_Type, Start_Date, Status) 
         VALUES (?, ?, 'Leased', ?, 'Active')`,
        [request.Property_ID, request.Tenant_ID, request.Requested_Start_Date]
      );
    }

    // Notify tenant
    await db.query(
      `INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
       VALUES ('Tenant', ?, 'Lease Request ${Status}', ?, 'lease', ?)`,
      [request.Tenant_ID, 
       Status === 'Approved' 
         ? `Your lease request has been approved! ${Owner_Response || ''}` 
         : `Your lease request has been rejected. ${Owner_Response || ''}`,
       req.params.id]
    );

    res.json({ message: `Lease request ${Status.toLowerCase()}`, Request_ID: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a lease
router.put('/:id', async (req, res) => {
  const {
    Property_ID,
    Tenant_ID,
    Start_Date,
    End_Date,
    Monthly_Rent,
    Security_Deposit,
    Lease_Terms,
    Status
  } = req.body;

  try {
    const [result] = await db.query(
      'UPDATE lease SET Property_ID = ?, Tenant_ID = ?, Start_Date = ?, End_Date = ?, Monthly_Rent = ?, Security_Deposit = ?, Lease_Terms = ?, Status = ? WHERE Lease_ID = ?',
      [Property_ID, Tenant_ID, Start_Date, End_Date, Monthly_Rent, Security_Deposit, Lease_Terms, Status, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Lease not found' });
    }
    res.json({ Lease_ID: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a lease
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM lease WHERE Lease_ID = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Lease not found' });
    }
    res.json({ message: 'Lease deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;