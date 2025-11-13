const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all properties
router.get('/', async (req, res) => {
  try {
    const [properties] = await db.query(`
      SELECT p.*, CONCAT(o.First_Name, ' ', o.Last_Name) as Owner_Name 
      FROM property p
      LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID
    `);
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get properties owned or rented by a specific tenant ("My Properties")
router.get('/tenant/:tenantId', async (req, res) => {
  const tenantId = req.params.tenantId;
  const seedIfEmpty = String(req.query.seedIfEmpty || '').toLowerCase() === '1' || String(req.query.seedIfEmpty || '').toLowerCase() === 'true';

  try {
    // Always include leases
    const [leaseRows] = await db.query(
      `SELECT 
          p.*, 
          CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
          'Leased' AS Relationship_Type
       FROM lease l
       JOIN property p ON p.Property_ID = l.Property_ID
       LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID
       WHERE l.Tenant_ID = ? AND (l.Status IS NULL OR l.Status = 'Active')`,
      [tenantId]
    );

    let combined = Array.isArray(leaseRows) ? leaseRows : [];

    // Try to append PropertyOwnership (optional schema)
    try {
      const [ownRows] = await db.query(
        `SELECT 
            p.*, 
            CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
            COALESCE(po.Ownership_Type, 'Owned') AS Relationship_Type
         FROM propertyownership po
         JOIN property p ON p.Property_ID = po.Property_ID
         LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID
         WHERE po.Tenant_ID = ? AND (po.Status IS NULL OR po.Status = 'Active')`,
        [tenantId]
      );
      if (Array.isArray(ownRows) && ownRows.length) {
        // Merge, avoiding duplicates by Property_ID
        const seen = new Set(combined.map((r) => r.Property_ID));
        for (const r of ownRows) {
          if (!seen.has(r.Property_ID)) combined.push(r);
        }
      }
    } catch (e) {
      // If table doesn't exist, ignore and continue with leases-only
      if (!(e && (e.code === 'ER_NO_SUCH_TABLE' || /doesn't exist/i.test(e.message || '')))) {
        // Unexpected error -> bubble up
        throw e;
      }
    }

    // If none linked and seeding requested, create a demo lease so UI shows something
    if (combined.length === 0 && seedIfEmpty) {
      try {
        // Pick an available property
        const [props] = await db.query(
          `SELECT Property_ID, Current_Value FROM property WHERE Status = 'Available' ORDER BY Created_At DESC LIMIT 1`
        );
        if (props.length > 0) {
          const prop = props[0];
          const [leaseInsert] = await db.query(
            `INSERT INTO lease (Property_ID, Tenant_ID, Start_Date, End_Date, Monthly_Rent, Status)
             VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 12 MONTH), ?, 'Active')`,
            [prop.Property_ID, tenantId, prop.Current_Value || 1000]
          );

          // Ensure the property is not shown in available listings any more
          await db.query(`UPDATE property SET Status = 'Leased' WHERE Property_ID = ?`, [prop.Property_ID]);

          // Best-effort: record in PropertyOwnership if table exists
          try {
            await db.query(
              `INSERT INTO propertyownership (Property_ID, Tenant_ID, Ownership_Type, Start_Date, Status)
               VALUES (?, ?, 'Leased', CURDATE(), 'Active')`,
              [prop.Property_ID, tenantId]
            );
          } catch (e2) {
            // Ignore if table doesn't exist
          }

          // Recompute combined list after seeding
          const [newLeaseRows] = await db.query(
            `SELECT 
                p.*, 
                CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
                'Leased' AS Relationship_Type
             FROM lease l
             JOIN property p ON p.Property_ID = l.Property_ID
             LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID
             WHERE l.Tenant_ID = ? AND (l.Status IS NULL OR l.Status = 'Active')`,
            [tenantId]
          );
          combined = Array.isArray(newLeaseRows) ? newLeaseRows : [];
        }
      } catch (seedErr) {
        // Ignore seeding errors; return current state
      }
    }

    // Sort by Created_At if present
    combined.sort((a, b) => {
      const da = new Date(a.Created_At || 0).getTime();
      const dbt = new Date(b.Created_At || 0).getTime();
      return dbt - da;
    });

    res.json(combined);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get available properties for tenant browsing
router.get('/available', async (req, res) => {
  try {
    const { listing_type, tenant_id } = req.query;

    // If tenant_id is present, try to scope by that tenant's Owner_ID (if column exists and populated)
    if (tenant_id) {
      try {
        const [tenantRows] = await db.query(
          'SELECT Owner_ID FROM tenant WHERE Tenant_ID = ?',
          [tenant_id]
        );
        if (tenantRows.length && tenantRows[0].Owner_ID) {
          const ownerId = tenantRows[0].Owner_ID;
          const [rows] = await db.query(
            `SELECT p.*, CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name
             FROM property p
             LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID
             WHERE p.Status = 'Available' AND p.Owner_ID = ?
             ${listing_type ? 'AND p.Listing_Type = ?' : ''}
             ORDER BY p.Created_At DESC`,
            listing_type ? [ownerId, listing_type] : [ownerId]
          );
          return res.json(rows);
        }
        // Tenant provided but not linked to any owner -> show nothing
        return res.json([]);
      } catch (e) {
        // If lookup failed for some reason, default to no results for safety
        return res.json([]);
      }
    }

    // Fallback: no tenant or no linked owner -> show all available (optionally filtered by listing_type)
    const [properties] = await db.query(
      `SELECT p.*, CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name
       FROM property p
       LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID
       WHERE p.Status = 'Available' ${listing_type ? 'AND p.Listing_Type = ?' : ''}
       ORDER BY p.Created_At DESC`,
      listing_type ? [listing_type] : []
    );
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get properties for a specific owner (with nested query for PG room details)
router.get('/owner/:ownerId', async (req, res) => {
  try {
    const ownerId = req.params.ownerId;
    const seedIfEmpty = String(req.query.seedIfEmpty || '').toLowerCase() === '1' || String(req.query.seedIfEmpty || '').toLowerCase() === 'true';
    
    let properties;
    try {
      [properties] = await db.query(
        `SELECT p.*,
          (SELECT COUNT(*) FROM Room WHERE Property_ID = p.Property_ID) AS Total_Rooms,
          (SELECT COUNT(*) FROM Room WHERE Property_ID = p.Property_ID AND Status = 'Available') AS Available_Rooms,
          (SELECT MIN(Rent_Per_Month) FROM Room WHERE Property_ID = p.Property_ID) AS Min_Room_Rent,
          (SELECT MAX(Rent_Per_Month) FROM Room WHERE Property_ID = p.Property_ID) AS Max_Room_Rent
         FROM property p
         WHERE p.Owner_ID = ?
            OR EXISTS (
              SELECT 1 FROM propertyownership po 
              WHERE po.Property_ID = p.Property_ID 
                AND po.Owner_ID = ? 
                AND (po.Status IS NULL OR po.Status = 'Active')
            )
         ORDER BY p.Created_At DESC`,
        [ownerId, ownerId]
      );
    } catch (roomError) {
      // If Room table doesn't exist, query without room details
      console.log('Room table not found, querying without room details');
      [properties] = await db.query(
        `SELECT p.*
         FROM property p
         WHERE p.Owner_ID = ?
            OR EXISTS (
              SELECT 1 FROM propertyownership po 
              WHERE po.Property_ID = p.Property_ID 
                AND po.Owner_ID = ? 
                AND (po.Status IS NULL OR po.Status = 'Active')
            )
         ORDER BY p.Created_At DESC`,
        [ownerId, ownerId]
      );
    }

    // Optional seeding for convenience: if owner has nothing, attach one available property
    if (seedIfEmpty && (!Array.isArray(properties) || properties.length === 0)) {
      try {
        const [avail] = await db.query(
          `SELECT Property_ID, Purchase_Price, Purchase_Date FROM property WHERE Status = 'Available' ORDER BY Created_At DESC LIMIT 1`
        );
        if (Array.isArray(avail) && avail.length) {
          const prop = avail[0];
          // Assign property to this owner
          await db.query(`UPDATE property SET Owner_ID = ? WHERE Property_ID = ?`, [ownerId, prop.Property_ID]);
          // Best-effort create PropertyOwnership row if table exists
          try {
            // Close any existing active ownership
            await db.query(
              `UPDATE propertyownership SET Status = 'Closed', End_Date = CURDATE() WHERE Property_ID = ? AND Status = 'Active'`,
              [prop.Property_ID]
            );
            await db.query(
              `INSERT INTO propertyownership (Property_ID, Owner_ID, Ownership_Type, Purchase_Price, Start_Date, Status)
               VALUES (?, ?, 'Owned', ?, COALESCE(?, CURDATE()), 'Active')`,
              [prop.Property_ID, ownerId, prop.Purchase_Price || null, prop.Purchase_Date || null]
            );
          } catch (e) {
            // Table might not exist in some schemas; ignore
          }
          // Requery
          const [after] = await db.query(
            `SELECT p.*,
              (SELECT COUNT(*) FROM Room WHERE Property_ID = p.Property_ID) AS Total_Rooms,
              (SELECT COUNT(*) FROM Room WHERE Property_ID = p.Property_ID AND Status = 'Available') AS Available_Rooms,
              (SELECT MIN(Rent_Per_Month) FROM Room WHERE Property_ID = p.Property_ID) AS Min_Room_Rent,
              (SELECT MAX(Rent_Per_Month) FROM Room WHERE Property_ID = p.Property_ID) AS Max_Room_Rent
             FROM property p
             WHERE p.Owner_ID = ?
                OR EXISTS (
                  SELECT 1 FROM propertyownership po 
                  WHERE po.Property_ID = p.Property_ID 
                    AND po.Owner_ID = ? 
                    AND (po.Status IS NULL OR po.Status = 'Active')
                )
             ORDER BY p.Created_At DESC`,
            [ownerId, ownerId]
          );
          properties = after;
        }
      } catch (seedErr) {
        // ignore seeding errors
      }
    }

    res.json(Array.isArray(properties) ? properties : []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single property
router.get('/:id', async (req, res) => {
  try {
    const [property] = await db.query(`
      SELECT p.*, CONCAT(o.First_Name, ' ', o.Last_Name) as Owner_Name,
             o.Email as Owner_Email, o.Phone as Owner_Phone
      FROM property p
      LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID
      WHERE p.Property_ID = ?
    `, [req.params.id]);
    if (property.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }
    res.json(property[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all purchase requests
router.get('/purchases/requests', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT pr.*, p.Property_Name, p.Street_Address, p.Current_Value,
             CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
             t.Email as Tenant_Email, t.Phone as Tenant_Phone
      FROM purchaserequest pr
      JOIN property p ON pr.Property_ID = p.Property_ID
      JOIN tenant t ON pr.Tenant_ID = t.Tenant_ID
      ORDER BY pr.Created_At DESC
    `);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get purchase requests for a specific owner
router.get('/purchases/owner/:ownerId', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT pr.*, p.Property_Name, p.Street_Address, p.Current_Value,
             CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
             t.Email as Tenant_Email, t.Phone as Tenant_Phone
      FROM purchaserequest pr
      JOIN property p ON pr.Property_ID = p.Property_ID
      JOIN tenant t ON pr.Tenant_ID = t.Tenant_ID
      WHERE p.Owner_ID = ? AND pr.Status = 'Pending'
      ORDER BY pr.Created_At DESC
    `, [req.params.ownerId]);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get purchase requests for a specific tenant
router.get('/purchases/tenant/:tenantId', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT pr.*, p.Property_Name, p.Street_Address, p.Current_Value
      FROM purchaserequest pr
      JOIN property p ON pr.Property_ID = p.Property_ID
      WHERE pr.Tenant_ID = ?
      ORDER BY pr.Created_At DESC
    `, [req.params.tenantId]);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a purchase request (Tenant action)
router.post('/purchase-request', async (req, res) => {
  const {
    Property_ID,
    Tenant_ID,
    Offer_Price,
    Message,
    Financing_Type
  } = req.body;

  try {
    // Get property details
    const [propertyData] = await db.query(
      'SELECT Owner_ID, Property_Name, Status, Current_Value FROM property WHERE Property_ID = ?',
      [Property_ID]
    );

    if (propertyData.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (propertyData[0].Status !== 'Available') {
      return res.status(400).json({ message: 'Property is not available for purchase' });
    }

    const Owner_ID = propertyData[0].Owner_ID;
    const Property_Name = propertyData[0].Property_Name;

    // Insert purchase request
    const [result] = await db.query(
      `INSERT INTO purchaserequest 
       (Property_ID, Tenant_ID, Offer_Price, Message, Financing_Type) 
       VALUES (?, ?, ?, ?, ?)`,
      [Property_ID, Tenant_ID, Offer_Price, Message, Financing_Type]
    );

    // Create notification for owner
    if (Owner_ID) {
      const [tenantData] = await db.query(
        'SELECT First_Name, Last_Name FROM tenant WHERE Tenant_ID = ?',
        [Tenant_ID]
      );
      
      const tenantName = tenantData.length > 0 
        ? `${tenantData[0].First_Name} ${tenantData[0].Last_Name}`
        : 'A buyer';

      await db.query(
        `INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
         VALUES ('Owner', ?, 'New Purchase Request', ?, 'purchase', ?)`,
        [Owner_ID, `${tenantName} made an offer of $${Offer_Price} for ${Property_Name}`, result.insertId]
      );
    }

    res.status(201).json({ Request_ID: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve or reject purchase request (Owner action)
router.put('/purchase-request/:id', async (req, res) => {
  const { Status, Owner_Response } = req.body;

  try {
    // Get purchase request details
    const [requestData] = await db.query(
      `SELECT pr.*, p.Owner_ID, p.Property_Name 
       FROM purchaserequest pr
       JOIN property p ON pr.Property_ID = p.Property_ID
       WHERE pr.Request_ID = ?`,
      [req.params.id]
    );

    if (requestData.length === 0) {
      return res.status(404).json({ message: 'Purchase request not found' });
    }

    const request = requestData[0];

    // Update purchase request status
    await db.query(
      'UPDATE purchaserequest SET Status = ?, Owner_Response = ? WHERE Request_ID = ?',
      [Status, Owner_Response, req.params.id]
    );

    // If approved, transfer ownership
    if (Status === 'Approved') {
      // Close old ownership record
      await db.query(
        `UPDATE propertyownership 
         SET Status = 'Closed', End_Date = CURDATE() 
         WHERE Property_ID = ? AND Status = 'Active'`,
        [request.Property_ID]
      );

      // Create new ownership record for tenant (now owner)
      await db.query(
        `INSERT INTO propertyownership 
         (Property_ID, Tenant_ID, Ownership_Type, Purchase_Price, Start_Date, Status) 
         VALUES (?, ?, 'Owned', ?, CURDATE(), 'Active')`,
        [request.Property_ID, request.Tenant_ID, request.Offer_Price]
      );

      // Update property status and remove from market
      await db.query(
        'UPDATE property SET Status = ?, Owner_ID = NULL WHERE Property_ID = ?',
        ['Sold', request.Property_ID]
      );

      // Create document record for sale
      await db.query(
        `INSERT INTO property_document 
         (Property_ID, Document_Type, Document_Name, File_Path) 
         VALUES (?, 'Sale Agreement', ?, ?)`,
        [request.Property_ID, 
         `Sale_Agreement_${request.Property_Name.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`,
         `/documents/sales/agreement_${req.params.id}.pdf`]
      );
    }

    // Notify tenant
    await db.query(
      `INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
       VALUES ('Tenant', ?, 'Purchase Request ${Status}', ?, 'purchase', ?)`,
      [request.Tenant_ID, 
       Status === 'Approved' 
         ? `Congratulations! Your purchase offer has been accepted. ${Owner_Response || ''}` 
         : `Your purchase offer has been declined. ${Owner_Response || ''}`,
       req.params.id]
    );

    res.json({ message: `Purchase request ${Status.toLowerCase()}`, Request_ID: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new property
router.post('/', async (req, res) => {
  const {
    Property_Name,
    Street_Address,
    City,
    State,
    ZIP_Code,
    Property_Type,
    Purchase_Date,
    Purchase_Price,
    Current_Value,
    Square_Footage,
    Year_Built,
    Status,
    Bedrooms,
    Bathrooms,
    Description,
    Image_URL,
    Listing_Type,
    Is_PG,
    Owner_ID
  } = req.body;

  // Validate required fields
  if (!Street_Address || !City || !State || !ZIP_Code) {
    return res.status(400).json({ 
      message: 'Street Address, City, State, and ZIP Code are required fields' 
    });
  }

  try {
    // Convert empty strings to null for numeric fields
    const purchasePrice = Purchase_Price === '' || Purchase_Price === undefined ? null : Purchase_Price;
    const currentValue = Current_Value === '' || Current_Value === undefined ? null : Current_Value;
    const squareFootage = Square_Footage === '' || Square_Footage === undefined ? null : Square_Footage;
    const yearBuilt = Year_Built === '' || Year_Built === undefined ? null : Year_Built;
    const bedrooms = Bedrooms === '' || Bedrooms === undefined ? 0 : Bedrooms;
    const bathrooms = Bathrooms === '' || Bathrooms === undefined ? 0 : Bathrooms;

    const [result] = await db.query(
      `INSERT INTO property 
       (Property_Name, Street_Address, City, State, ZIP_Code, Property_Type, Purchase_Date, 
        Purchase_Price, Current_Value, Square_Footage, Year_Built, Status, Bedrooms, Bathrooms, 
        Description, Image_URL, Listing_Type, Is_PG, Owner_ID) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [Property_Name, Street_Address, City, State, ZIP_Code, Property_Type, Purchase_Date, 
       purchasePrice, currentValue, squareFootage, yearBuilt, Status || 'Available', 
       bedrooms, bathrooms, Description, Image_URL, Listing_Type || 'Sale', 
       Is_PG || false, Owner_ID]
    );

    // Create ownership record if owner is specified
    if (Owner_ID) {
      await db.query(
        `INSERT INTO propertyownership 
         (Property_ID, Owner_ID, Ownership_Type, Purchase_Price, Start_Date, Status) 
         VALUES (?, ?, 'Owned', ?, ?, 'Active')`,
        [result.insertId, Owner_ID, purchasePrice, Purchase_Date || new Date()]
      );
    }

    res.status(201).json({ Property_ID: result.insertId, ...req.body });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update a property
router.put('/:id', async (req, res) => {
  const {
    Property_Name,
    Street_Address,
    City,
    State,
    ZIP_Code,
    Property_Type,
    Purchase_Date,
    Purchase_Price,
    Current_Value,
    Square_Footage,
    Year_Built,
    Status,
    Bedrooms,
    Bathrooms,
    Description,
    Image_URL,
    Listing_Type,
    Is_PG
  } = req.body;

  try {
    const [result] = await db.query(
      'UPDATE property SET Property_Name = ?, Street_Address = ?, City = ?, State = ?, ZIP_Code = ?, Property_Type = ?, Purchase_Date = ?, Purchase_Price = ?, Current_Value = ?, Square_Footage = ?, Year_Built = ?, Status = ?, Bedrooms = ?, Bathrooms = ?, Description = ?, Image_URL = ?, Listing_Type = ?, Is_PG = ? WHERE Property_ID = ?',
      [Property_Name, Street_Address, City, State, ZIP_Code, Property_Type, Purchase_Date, Purchase_Price, Current_Value, Square_Footage, Year_Built, Status, Bedrooms, Bathrooms, Description, Image_URL, Listing_Type, Is_PG, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }
    res.json({ Property_ID: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a property
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM property WHERE Property_ID = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;