require('dotenv').config();
const db = require('../config/database');

async function ensureOne(query, params = []) {
  const [rows] = await db.query(query, params);
  return rows;
}

async function getId(table, whereField, whereValue, idField) {
  const [rows] = await db.query(`SELECT ${idField} FROM ${table} WHERE ${whereField} = ? LIMIT 1`, [whereValue]);
  return rows.length ? rows[0][idField] : null;
}

async function count(table) {
  const [rows] = await db.query(`SELECT COUNT(*) as c FROM ${table}`);
  return rows[0].c;
}

async function tableExists(name) {
  try {
    await db.query(`SELECT 1 FROM ${name} LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

async function seed() {
  // Ensure base Owner
  const ownerEmail = 'owner@email.com';
  let ownerId = await getId('Owner', 'Email', ownerEmail, 'Owner_ID');
  if (!ownerId) {
    const [res] = await db.query(
      `INSERT INTO Owner (First_Name, Last_Name, Email, Phone) VALUES (?, ?, ?, ?)`,
      ['Admin', 'Owner', ownerEmail, '555-1000']
    );
    ownerId = res.insertId;
    console.log('Inserted Owner:', ownerId);
  }

  // Ensure base Tenant (John Doe)
  const tenantEmail = 'john.doe@email.com';
  let tenantId = await getId('Tenant', 'Email', tenantEmail, 'Tenant_ID');
  if (!tenantId) {
    const [res] = await db.query(
      `INSERT INTO Tenant (First_Name, Last_Name, Email, Phone, Credit_Score, Employment_Status, Monthly_Income)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['John', 'Doe', tenantEmail, '555-0100', 700, 'Employed', 5000]
    );
    tenantId = res.insertId;
    console.log('Inserted Tenant:', tenantId);
  }

  // Link the demo tenant to the demo owner for proper scoping (if Owner_ID column exists)
  try {
    await db.query(`UPDATE Tenant SET Owner_ID = ? WHERE Tenant_ID = ?`, [ownerId, tenantId]);
  } catch {
    // Column might not exist; ignore
  }

  // Ensure at least one Property owned by the base owner
  let propertyId = null;
  {
    const [rows] = await db.query(`SELECT Property_ID FROM Property WHERE Owner_ID = ? LIMIT 1`, [ownerId]);
    if (rows.length) {
      propertyId = rows[0].Property_ID;
    } else {
      const [res] = await db.query(
        `INSERT INTO Property 
          (Property_Name, Street_Address, City, State, ZIP_Code, Property_Type, Purchase_Date, Purchase_Price, Current_Value, Square_Footage, Year_Built, Status, Bedrooms, Bathrooms, Description, Image_URL, Listing_Type, Is_PG, Owner_ID)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'Demo Rental', '100 Demo St', 'Austin', 'TX', '78701', 'Apartment',
          '2020-01-01', 250000, 1800, 950, 2015, 'Available', 2, 1,
          'Cozy demo rental for testing flows',
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
          'Rent', false, ownerId
        ]
      );
      propertyId = res.insertId;
      console.log('Inserted Property:', propertyId);
    }
  }

  // Ensure PropertyOwnership has an active row for this property/owner (if table exists)
  if (await tableExists('PropertyOwnership')) {
    const [ownRows] = await db.query(
      `SELECT Ownership_ID FROM PropertyOwnership WHERE Property_ID = ? AND Owner_ID = ? AND Status = 'Active' LIMIT 1`,
      [propertyId, ownerId]
    );
    if (!ownRows.length) {
      // Close any existing active ownership for this property
      await db.query(
        `UPDATE PropertyOwnership SET Status = 'Closed', End_Date = CURDATE() WHERE Property_ID = ? AND Status = 'Active'`,
        [propertyId]
      );
      await db.query(
        `INSERT INTO PropertyOwnership (Property_ID, Owner_ID, Ownership_Type, Purchase_Price, Start_Date, Status)
         VALUES (?, ?, 'Owned', 250000, CURDATE(), 'Active')`,
        [propertyId, ownerId]
      );
      console.log('Ensured PropertyOwnership record for admin owner');
    }
  }

  // Ensure a Lease exists for the admin property and demo tenant
  let leaseId = null;
  if (await tableExists('Lease')) {
    const [leaseRows] = await db.query(
      `SELECT Lease_ID FROM Lease WHERE Property_ID = ? AND Tenant_ID = ? AND (Status IS NULL OR Status = 'Active') LIMIT 1`,
      [propertyId, tenantId]
    );
    if (leaseRows.length) {
      leaseId = leaseRows[0].Lease_ID;
    } else {
      const [res] = await db.query(
        `INSERT INTO Lease (Property_ID, Tenant_ID, Start_Date, End_Date, Monthly_Rent, Security_Deposit, Lease_Terms, Status)
         VALUES (?, ?, DATE_SUB(CURDATE(), INTERVAL 15 DAY), DATE_ADD(CURDATE(), INTERVAL 11 MONTH), 1800, 1800, 'Demo lease', 'Active')`,
        [propertyId, tenantId]
      );
      leaseId = res.insertId;
      console.log('Inserted Lease for admin owner:', leaseId);
    }
  }

  // Ensure a Maintenance_Request exists for this property (pending)
  if (await tableExists('Maintenance_Request')) {
    const [mrRows] = await db.query(
      `SELECT Request_ID FROM Maintenance_Request WHERE Property_ID = ? AND (Status = 'Pending' OR Status = 'In Progress') LIMIT 1`,
      [propertyId]
    );
    if (!mrRows.length) {
      await db.query(
        `INSERT INTO Maintenance_Request (Property_ID, Tenant_ID, Description, Priority, Status)
         VALUES (?, ?, 'Leaking faucet in kitchen', 'High', 'Pending')`,
        [propertyId, tenantId]
      );
      console.log('Ensured a Maintenance_Request for admin owner');
    }
  }

  // Ensure a Payment exists for this lease (pending)
  if (leaseId && await tableExists('Payment')) {
    const [payRows] = await db.query(
      `SELECT Payment_ID FROM Payment WHERE Lease_ID = ? LIMIT 1`,
      [leaseId]
    );
    if (!payRows.length) {
      await db.query(
        `INSERT INTO Payment (Lease_ID, Amount, Payment_Date, Payment_Method, Status, Due_Date, Notes)
         VALUES (?, 1800, CURDATE(), 'Bank Transfer', 'Pending', DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'Demo pending payment')`,
        [leaseId]
      );
      console.log('Inserted Payment for admin owner lease');
    }
  }

  // Ensure one Insurance_Policy
  if (await tableExists('Insurance_Policy')) {
    const c = await count('Insurance_Policy');
    if (c === 0) {
      await db.query(
        `INSERT INTO Insurance_Policy (Property_ID, Provider, Policy_Number, Coverage_Type, Premium_Amount, Start_Date, End_Date, Status)
         VALUES (?, 'Demo Insurance', 'POLICY-DEMO-001', 'Standard', 1200, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), 'Active')`,
        [propertyId]
      );
      console.log('Inserted Insurance_Policy');
    }
  }

  // Ensure at least one Property_Document for this property
  if (await tableExists('Property_Document')) {
    const [docRows] = await db.query(
      `SELECT Document_ID FROM Property_Document WHERE Property_ID = ? LIMIT 1`,
      [propertyId]
    );
    if (!docRows.length) {
      await db.query(
        `INSERT INTO Property_Document (Property_ID, Document_Type, Document_Name, File_Path)
         VALUES (?, 'Deed', 'Demo_Deed.pdf', '/documents/deeds/demo_deed.pdf')`,
        [propertyId]
      );
      console.log('Inserted Property_Document for admin owner');
    }
  }

  // Ensure a tenant-requested Property_Inspection exists for this property
  if (await tableExists('Property_Inspection')) {
    const [inspRows] = await db.query(
      `SELECT Inspection_ID FROM Property_Inspection WHERE Property_ID = ? AND (Status = 'Pending' OR Status = 'Scheduled') LIMIT 1`,
      [propertyId]
    );
    if (!inspRows.length) {
      try {
        await db.query(
          `INSERT INTO Property_Inspection (Property_ID, Tenant_ID, Inspection_Date, Inspector_Name, Inspection_Type, Results, Status, Request_Type)
           VALUES (?, ?, DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'Inspector Demo', 'General', 'Requested by tenant', 'Pending', 'Tenant Requested')`,
          [propertyId, tenantId]
        );
      } catch {
        await db.query(
          `INSERT INTO Property_Inspection (Property_ID, Inspection_Date, Inspector_Name, Inspection_Type, Results, Status)
           VALUES (?, DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'Inspector Demo', 'General', 'Requested by tenant', 'Pending')`,
          [propertyId]
        );
      }
      console.log('Ensured Property_Inspection for admin owner');
    }
  }

  // Ensure one LeaseRequest
  if (await tableExists('LeaseRequest')) {
    const c = await count('LeaseRequest');
    if (c === 0) {
      await db.query(
        `INSERT INTO LeaseRequest (Property_ID, Tenant_ID, Requested_Start_Date, Requested_End_Date, Monthly_Rent, Message, Status)
         VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), 1800, 'Demo lease request', 'Pending')`,
        [propertyId, tenantId]
      );
      console.log('Inserted LeaseRequest');
    }
  }

  // Ensure one PurchaseRequest
  if (await tableExists('PurchaseRequest')) {
    const c = await count('PurchaseRequest');
    if (c === 0) {
      await db.query(
        `INSERT INTO PurchaseRequest (Property_ID, Tenant_ID, Offer_Price, Message, Financing_Type, Status)
         VALUES (?, ?, 300000, 'Demo purchase offer', 'Mortgage', 'Pending')`,
        [propertyId, tenantId]
      );
      console.log('Inserted PurchaseRequest');
    }
  }

  // Ensure one Notification to the owner
  if (await tableExists('Notification')) {
    const c = await count('Notification');
    if (c === 0) {
      await db.query(
        `INSERT INTO Notification (User_Type, User_ID, Title, Message, Type)
         VALUES ('Owner', ?, 'Welcome', 'Your demo environment is ready.', 'general')`,
        [ownerId]
      );
      console.log('Inserted Notification');
    }
  }

  console.log('\n✓ Minimal demo data ensured.');
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  });
