const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Helper: Try stored procedure first; fallback to inline SQL if procedure missing
async function callProcedure(procName, params = []) {
  const placeholders = params.map(() => '?').join(',');
  try {
    const [rows] = await db.query(`CALL ${procName}(${placeholders})`, params);
    // mysql2 returns an array of result sets; first set has our rows
    const data = Array.isArray(rows) ? (Array.isArray(rows[0]) ? rows[0] : rows) : rows;
    return { data };
  } catch (err) {
    // 1305 ER_SP_DOES_NOT_EXIST: Procedure does not exist
    if (err && (err.code === 'ER_SP_DOES_NOT_EXIST' || err.errno === 1305)) {
      return { data: null, missing: true };
    }
    throw err;
  }
}

router.get('/owner/:ownerId/offers', async (req, res) => {
  try {
    const proc = await callProcedure('GetOwnerInsuranceOffers', [req.params.ownerId]);
    if (proc.data) {
      return res.json(proc.data);
    }

    // Fallback inline SQL
    const [offers] = await db.query(`
      SELECT 
        io.*,
        p.Property_Name,
        p.Street_Address,
        CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
        t.Email as Tenant_Email,
        t.Phone as Tenant_Phone,
        -- Nested query: Get tenant's total insurance value
        (SELECT COALESCE(SUM(Coverage_Amount), 0) 
         FROM Insurance_Offer 
         WHERE Tenant_ID = io.Tenant_ID AND Status = 'Accepted') AS Tenant_Total_Coverage,
        -- Nested query: Count tenant's active policies
        (SELECT COUNT(*) 
         FROM Insurance_Offer 
         WHERE Tenant_ID = io.Tenant_ID AND Status = 'Accepted') AS Tenant_Active_Policies
  FROM Insurance_Offer io
  JOIN Property p ON io.Property_ID = p.Property_ID
  JOIN Tenant t ON io.Tenant_ID = t.Tenant_ID
      WHERE p.Owner_ID = ?
      ORDER BY 
        CASE io.Status 
          WHEN 'Pending' THEN 1 
          WHEN 'Accepted' THEN 2 
          WHEN 'Rejected' THEN 3 
          ELSE 4 
        END,
        io.Created_At DESC
    `, [req.params.ownerId]);
    
    res.json(offers);
  } catch (error) {
    console.error('Error fetching insurance offers:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get insurance statistics for owner (aggregate queries)
router.get('/owner/:ownerId/stats', async (req, res) => {
  try {
    // Prefer stored procedure if available
    const proc = await callProcedure('GetOwnerInsuranceStats', [req.params.ownerId]);
    if (proc.data) {
      return res.json(proc.data[0] || {});
    }

    // Fallback inline SQL
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_offers,
        SUM(CASE WHEN io.Status = 'Pending' THEN 1 ELSE 0 END) as pending_offers,
        SUM(CASE WHEN io.Status = 'Accepted' THEN 1 ELSE 0 END) as accepted_offers,
        SUM(CASE WHEN io.Status = 'Rejected' THEN 1 ELSE 0 END) as rejected_offers,
        COALESCE(SUM(CASE WHEN io.Status = 'Accepted' THEN io.Premium_Amount ELSE 0 END), 0) as total_premium_revenue,
        COALESCE(SUM(CASE WHEN io.Status = 'Accepted' THEN io.Coverage_Amount ELSE 0 END), 0) as total_coverage_provided,
        COALESCE(AVG(CASE WHEN io.Status = 'Accepted' THEN io.Premium_Amount ELSE NULL END), 0) as avg_premium
      FROM Insurance_Offer io
      JOIN Property p ON io.Property_ID = p.Property_ID
      WHERE p.Owner_ID = ?
    `, [req.params.ownerId]);
    
    res.json(stats[0] || {});
  } catch (error) {
    console.error('Error fetching insurance stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get tenants eligible for insurance (nested query - tenants with active leases and no pending offers)
router.get('/owner/:ownerId/eligible-tenants', async (req, res) => {
  try {
    const proc = await callProcedure('GetEligibleTenantsForOwner', [req.params.ownerId]);
    if (proc.data) {
      return res.json(proc.data);
    }

    // Fallback inline SQL
    const [tenants] = await db.query(`
      SELECT DISTINCT
        t.Tenant_ID,
        CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
        t.Email,
        t.Phone,
        t.Credit_Score,
        t.Monthly_Income,
        p.Property_ID,
        p.Property_Name,
        p.Street_Address,
        l.Monthly_Rent,
        l.Start_Date,
        l.End_Date,
        -- Nested query: Check if tenant already has pending offer for this property
        (SELECT COUNT(*) 
         FROM Insurance_Offer 
         WHERE Tenant_ID = t.Tenant_ID 
         AND Property_ID = p.Property_ID 
         AND Status = 'Pending') AS Has_Pending_Offer
      FROM Tenant t
      JOIN Lease l ON t.Tenant_ID = l.Tenant_ID
      JOIN Property p ON l.Property_ID = p.Property_ID
      WHERE p.Owner_ID = ?
      AND l.Status = 'Active'
      AND l.End_Date >= CURDATE()
      AND p.Property_ID NOT IN (
        SELECT Property_ID 
        FROM Insurance_Offer 
        WHERE Tenant_ID = t.Tenant_ID 
        AND Status IN ('Pending', 'Accepted')
      )
      ORDER BY p.Property_Name, Tenant_Name
    `, [req.params.ownerId]);
    
    res.json(tenants);
  } catch (error) {
    console.error('Error fetching eligible tenants:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create insurance offer (Owner action - using stored procedure concept)
router.post('/owner/offer', async (req, res) => {
  const {
    Property_ID,
    Tenant_ID,
    Provider,
    Coverage_Type,
    Coverage_Amount,
    Premium_Amount,
    Premium_Frequency,
    Start_Date,
    End_Date,
    Terms,
    Benefits
  } = req.body;

  try {
    const proc = await callProcedure('CreateInsuranceOffer', [
      Property_ID,
      Tenant_ID,
      Provider,
      Coverage_Type,
      Coverage_Amount,
      Premium_Amount,
      Premium_Frequency,
      Start_Date,
      End_Date,
      Terms,
      Benefits
    ]);

    if (proc.data) {
      // Expect procedure to return the inserted Offer_ID as first row
      const offerRow = Array.isArray(proc.data) && proc.data.length > 0 ? proc.data[0] : {};
      return res.status(201).json({
        Offer_ID: offerRow.Offer_ID || offerRow.insert_id || offerRow.id || null,
        message: 'Insurance offer created successfully (SP)',
        ...req.body
      });
    }

    // Fallback to inline implementation with app-managed transaction and explicit notifications
    await db.query('START TRANSACTION');

    const [result] = await db.query(
      `INSERT INTO Insurance_Offer 
       (Property_ID, Tenant_ID, Provider, Coverage_Type, Coverage_Amount, 
        Premium_Amount, Premium_Frequency, Start_Date, End_Date, Terms, Benefits, Status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [Property_ID, Tenant_ID, Provider, Coverage_Type, Coverage_Amount,
       Premium_Amount, Premium_Frequency, Start_Date, End_Date, Terms, Benefits]
    );

    const offerId = result.insertId;

    const [propertyData] = await db.query(
      'SELECT Property_Name FROM Property WHERE Property_ID = ?',
      [Property_ID]
    );

    await db.query(
      `INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
       VALUES ('Tenant', ?, 'New Insurance Offer', ?, 'insurance', ?)`,
      [
        Tenant_ID,
        `You have received an insurance offer for ${propertyData[0].Property_Name}. Coverage: ${Coverage_Type} - $${Coverage_Amount}`,
        offerId
      ]
    );

    await db.query('COMMIT');

    res.status(201).json({
      Offer_ID: offerId,
      message: 'Insurance offer created successfully',
      ...req.body
    });
  } catch (error) {
    // Ensure any open transaction is rolled back in fallback path
    try { await db.query('ROLLBACK'); } catch (_) {}
    console.error('Error creating insurance offer:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update insurance offer status (Owner can cancel)
router.put('/owner/offer/:offerId', async (req, res) => {
  const { Status, Owner_Response } = req.body;

  try {
    // Prefer stored procedure if available (triggers may handle side-effects)
    const proc = await callProcedure('UpdateInsuranceOfferStatus', [
      req.params.offerId,
      Status,
      Owner_Response
    ]);

    if (proc.data) {
      return res.json({ message: 'Insurance offer updated successfully (SP)' });
    }

    // Fallback inline update
    const [result] = await db.query(
      `UPDATE Insurance_Offer 
       SET Status = ?, Owner_Response = ?, Updated_At = CURRENT_TIMESTAMP
       WHERE Offer_ID = ?`,
      [Status, Owner_Response, req.params.offerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Insurance offer not found' });
    }

    res.json({ message: 'Insurance offer updated successfully' });
  } catch (error) {
    console.error('Error updating insurance offer:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/tenant/:tenantId/offers', async (req, res) => {
  try {
    // Prefer stored procedure if available
    const proc = await callProcedure('GetTenantInsuranceOffers', [req.params.tenantId]);
    if (proc.data) {
      return res.json(proc.data);
    }

    // Fallback inline SQL
    const [offers] = await db.query(`
      SELECT 
        io.*,
        p.Property_Name,
        p.Street_Address,
        p.City,
        p.State,
        CONCAT(o.First_Name, ' ', o.Last_Name) as Owner_Name,
        o.Email as Owner_Email,
        o.Phone as Owner_Phone
      FROM Insurance_Offer io
      JOIN Property p ON io.Property_ID = p.Property_ID
      LEFT JOIN Owner o ON p.Owner_ID = o.Owner_ID
      WHERE io.Tenant_ID = ?
      ORDER BY 
        CASE io.Status 
          WHEN 'Pending' THEN 1 
          WHEN 'Accepted' THEN 2 
          WHEN 'Rejected' THEN 3 
          ELSE 4 
        END,
        io.Created_At DESC
    `, [req.params.tenantId]);
    
    res.json(offers);
  } catch (error) {
    console.error('Error fetching tenant insurance offers:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get tenant's insurance statistics (aggregate queries)
router.get('/tenant/:tenantId/stats', async (req, res) => {
  try {
    // Prefer stored procedure if available
    const proc = await callProcedure('GetTenantInsuranceStats', [req.params.tenantId]);
    if (proc.data) {
      return res.json(proc.data[0] || {});
    }

    // Fallback inline SQL
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_offers,
        SUM(CASE WHEN Status = 'Pending' THEN 1 ELSE 0 END) as pending_offers,
        SUM(CASE WHEN Status = 'Accepted' THEN 1 ELSE 0 END) as active_policies,
        SUM(CASE WHEN Status = 'Rejected' THEN 1 ELSE 0 END) as rejected_offers,
        COALESCE(SUM(CASE WHEN Status = 'Accepted' THEN Premium_Amount ELSE 0 END), 0) as total_monthly_premium,
        COALESCE(SUM(CASE WHEN Status = 'Accepted' THEN Coverage_Amount ELSE 0 END), 0) as total_coverage,
        MIN(CASE WHEN Status = 'Accepted' THEN Start_Date ELSE NULL END) as earliest_policy_start,
        MAX(CASE WHEN Status = 'Accepted' THEN End_Date ELSE NULL END) as latest_policy_end
      FROM Insurance_Offer
      WHERE Tenant_ID = ?
    `, [req.params.tenantId]);
    
    res.json(stats[0] || {});
  } catch (error) {
    console.error('Error fetching tenant insurance stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// Respond to insurance offer (Tenant action - Accept/Reject)
router.put('/tenant/offer/:offerId/respond', async (req, res) => {
  const { Status, Tenant_Response } = req.body; // Status: 'Accepted' or 'Rejected'

  try {
    // Prefer stored procedure if available (triggers handle policy/transactions/notifications)
    const proc = await callProcedure('RespondToInsuranceOffer', [
      req.params.offerId,
      Status,
      Tenant_Response
    ]);

    if (proc.data) {
      return res.json({ 
        message: `Insurance offer ${Status.toLowerCase()} successfully (SP)`,
        Offer_ID: req.params.offerId
      });
    }

    // Fallback: application-managed transaction and explicit side-effects
    await db.query('START TRANSACTION');

    const [offerData] = await db.query(
      `SELECT io.*, p.Property_Name, p.Owner_ID 
       FROM Insurance_Offer io
       JOIN Property p ON io.Property_ID = p.Property_ID
       WHERE io.Offer_ID = ?`,
      [req.params.offerId]
    );

    if (offerData.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: 'Insurance offer not found' });
    }

    const offer = offerData[0];

    await db.query(
      `UPDATE Insurance_Offer 
       SET Status = ?, Tenant_Response = ?, 
           Response_Date = CURDATE(),
           Updated_At = CURRENT_TIMESTAMP
       WHERE Offer_ID = ?`,
      [Status, Tenant_Response, req.params.offerId]
    );

    if (Status === 'Accepted') {
      const policyNumber = `POL-${new Date().getFullYear()}-${String(req.params.offerId).padStart(6, '0')}`;
      
      await db.query(
        `INSERT INTO Insurance_Policy 
         (Property_ID, Provider, Policy_Number, Coverage_Type, Premium_Amount, Start_Date, End_Date, Status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')`,
        [offer.Property_ID, offer.Provider, policyNumber, offer.Coverage_Type, 
         offer.Premium_Amount, offer.Start_Date, offer.End_Date]
      );

      await db.query(
        `INSERT INTO Financial_Transaction 
         (Property_ID, Transaction_Type, Amount, Transaction_Date, Description, Category)
         VALUES (?, 'Expense', ?, CURDATE(), ?, 'Insurance')`,
        [offer.Property_ID, offer.Premium_Amount, 
         `Insurance Premium - ${offer.Coverage_Type} - Policy ${policyNumber}`]
      );
    }

    if (offer.Owner_ID) {
      await db.query(
        `INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
         VALUES ('Owner', ?, 'Insurance Offer Response', ?, 'insurance', ?)`,
        [
          offer.Owner_ID,
          `Tenant has ${Status.toLowerCase()} the insurance offer for ${offer.Property_Name}. ${Tenant_Response || ''}`,
          req.params.offerId
        ]
      );
    }

    await db.query('COMMIT');

    res.json({ 
      message: `Insurance offer ${Status.toLowerCase()} successfully`,
      Offer_ID: req.params.offerId
    });
  } catch (error) {
    try { await db.query('ROLLBACK'); } catch (_) {}
    console.error('Error responding to insurance offer:', error);
    res.status(500).json({ message: error.message });
  }
});
// Get all insurance policies for a property (nested query with aggregates)
router.get('/property/:propertyId/policies', async (req, res) => {
  try {
    // Prefer stored procedure if available
    const proc = await callProcedure('GetPropertyInsurancePolicies', [req.params.propertyId]);
    if (proc.data) {
      return res.json(proc.data);
    }

    // Fallback inline SQL
    const [policies] = await db.query(`
      SELECT 
        ip.*,
        p.Property_Name,
        p.Street_Address,
        DATEDIFF(ip.End_Date, CURDATE()) as Days_Until_Expiry,
        -- Nested query: Total premium paid for this policy
        (SELECT COALESCE(SUM(Amount), 0) 
         FROM Financial_Transaction 
         WHERE Property_ID = ip.Property_ID 
         AND Category = 'Insurance' 
         AND Transaction_Date BETWEEN ip.Start_Date AND ip.End_Date) AS Total_Premium_Paid
      FROM Insurance_Policy ip
      JOIN Property p ON ip.Property_ID = p.Property_ID
      WHERE ip.Property_ID = ?
      ORDER BY ip.End_Date DESC
    `, [req.params.propertyId]);
    
    res.json(policies);
  } catch (error) {
    console.error('Error fetching property policies:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get expiring insurance policies (nested query - policies expiring in next 30 days)
router.get('/expiring', async (req, res) => {
  try {
    // Prefer stored procedure if available
    const proc = await callProcedure('GetExpiringInsurancePolicies', []);
    if (proc.data) {
      return res.json(proc.data);
    }

    // Fallback inline SQL
    const [policies] = await db.query(`
      SELECT 
        ip.*,
        p.Property_Name,
        p.Street_Address,
        CONCAT(o.First_Name, ' ', o.Last_Name) as Owner_Name,
        DATEDIFF(ip.End_Date, CURDATE()) as Days_Until_Expiry
      FROM Insurance_Policy ip
      JOIN Property p ON ip.Property_ID = p.Property_ID
      LEFT JOIN Owner o ON p.Owner_ID = o.Owner_ID
      WHERE ip.Status = 'Active'
      AND ip.End_Date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      AND ip.Property_ID NOT IN (
        SELECT DISTINCT Property_ID 
        FROM Insurance_Offer 
        WHERE Start_Date > ip.End_Date 
        AND Status = 'Accepted'
      )
      ORDER BY Days_Until_Expiry ASC
    `);
    
    res.json(policies);
  } catch (error) {
    console.error('Error fetching expiring policies:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
 
// --- Demo endpoints to showcase calling MySQL FUNCTIONS and firing TRIGGERS ---
// These are additive and do not interfere with existing routes.
// They run safely; trigger demos use a transaction and roll back.

// Call 3 MySQL scalar functions with graceful inline fallbacks
router.get('/demo/functions', async (req, res) => {
  const propertyId = Number(req.query.propertyId) || null;
  const tenantId = Number(req.query.tenantId) || null;
  const listingType = req.query.listingType || null;

  try {
    const result = {};

    // 1) GetMonthlyRentalIncome(propertyId)
    if (propertyId) {
      try {
        const [r] = await db.query('SELECT GetMonthlyRentalIncome(?) AS val', [propertyId]);
        result.monthlyRentalIncome = r[0]?.val ?? null;
      } catch (err) {
        if (err && (err.code === 'ER_SP_DOES_NOT_EXIST' || err.errno === 1305)) {
          const [r2] = await db.query(
            `SELECT ROUND(COALESCE(SUM(Monthly_Rent), 0), 2) AS val
             FROM Lease
             WHERE Property_ID = ?
               AND Status = 'Active'
               AND End_Date >= CURRENT_DATE()`,
            [propertyId]
          );
          result.monthlyRentalIncome = r2[0]?.val ?? null;
        } else {
          throw err;
        }
      }
    }

    // 2) GetTenantDueAmount(tenantId)
    if (tenantId) {
      try {
        const [r] = await db.query('SELECT GetTenantDueAmount(?) AS val', [tenantId]);
        result.tenantDueAmount = r[0]?.val ?? null;
      } catch (err) {
        if (err && (err.code === 'ER_SP_DOES_NOT_EXIST' || err.errno === 1305)) {
          const [r2] = await db.query(
            `SELECT ROUND(COALESCE(SUM(p.Amount + COALESCE(p.Late_Fee, 0)), 0), 2) AS val
               FROM Payment p
              WHERE p.Tenant_ID = ?
                AND (p.Status = 'Pending'
                     OR (p.Status <> 'Paid' AND p.Due_Date IS NOT NULL AND CURRENT_DATE() > p.Due_Date))`,
            [tenantId]
          );
          result.tenantDueAmount = r2[0]?.val ?? null;
        } else {
          throw err;
        }
      }
    }

    // 3) IsPropertyAvailable(propertyId, listingType)
    if (propertyId) {
      try {
        const [r] = await db.query('SELECT IsPropertyAvailable(?, ?) AS val', [propertyId, listingType]);
        // MySQL returns tinyint(1) for BOOLEAN
        result.isPropertyAvailable = r[0]?.val === 1 || r[0]?.val === true;
      } catch (err) {
        if (err && (err.code === 'ER_SP_DOES_NOT_EXIST' || err.errno === 1305)) {
          const params = [propertyId];
          let sql = `SELECT CASE WHEN Status = 'Available'`;
          if (listingType) {
            sql += ` AND Listing_Type = ?`;
            params.push(listingType);
          }
          sql += ` THEN 1 ELSE 0 END AS val FROM Property WHERE Property_ID = ?`;
          // propertyId again for WHERE
          params.push(propertyId);
          const [r2] = await db.query(sql, params);
          result.isPropertyAvailable = r2[0]?.val === 1;
        } else {
          throw err;
        }
      }
    }

    res.json({
      info: 'Demo values from MySQL functions with inline SQL fallbacks',
      input: { propertyId, tenantId, listingType },
      result
    });
  } catch (error) {
    console.error('Demo functions error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Fire 3 triggers inside a single transaction and roll back so no data persists
router.post('/demo/triggers', async (req, res) => {
  // Optional hints from body to pick specific rows
  const { propertyId: propertyIdInput, tenantId: tenantIdInput } = req.body || {};

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Try to locate a property that has an owner (needed for insurance notification trigger)
    let [props] = await conn.query(
      `SELECT Property_ID, Owner_ID, Status FROM Property WHERE Owner_ID IS NOT NULL LIMIT 1`
    );
    let propertyId = propertyIdInput || props[0]?.Property_ID || null;
    let ownerId = props[0]?.Owner_ID || null;

    if (!propertyId) {
      throw new Error('No property with an owner found for trigger demo. Provide propertyId in body.');
    }

    // Find a tenant; prefer one with an active lease on this property, else any tenant
    let [tenantsOnProp] = await conn.query(
      `SELECT Tenant_ID FROM Lease WHERE Property_ID = ? LIMIT 1`,
      [propertyId]
    );
    let tenantId = tenantIdInput || tenantsOnProp[0]?.Tenant_ID;
    if (!tenantId) {
      let [anyTenant] = await conn.query(`SELECT Tenant_ID FROM Tenant LIMIT 1`);
      tenantId = anyTenant[0]?.Tenant_ID || null;
    }
    if (!tenantId) {
      throw new Error('No tenant found for trigger demo. Provide tenantId in body.');
    }

    const results = {
      checkLeaseDatesBeforeInsert: { fired: false, error: null },
      updatePropertyStatusAfterLeaseEnd: { fired: false, before: null, after: null },
      notifyOwnerInsuranceResponse: { fired: false, createdOfferId: null, notificationRows: 0 }
    };

    // Trigger 1: check_lease_dates_before_insert (expect failure)
    try {
      await conn.query(
        `INSERT INTO Lease (Property_ID, Tenant_ID, Start_Date, End_Date, Monthly_Rent, Status)
         VALUES (?, ?, CURRENT_DATE, CURRENT_DATE, 1000, 'Active')`,
        [propertyId, tenantId]
      );
      const [lastRow] = await conn.query('SELECT LAST_INSERT_ID() AS id');
      const badLeaseId = lastRow[0]?.id;
      results.checkLeaseDatesBeforeInsert.fired = false;
      if (badLeaseId) {
        await conn.query('DELETE FROM Lease WHERE Lease_ID = ?', [badLeaseId]);
      }
    } catch (e) {
      results.checkLeaseDatesBeforeInsert.fired = true;
      results.checkLeaseDatesBeforeInsert.error = e.message;
    }

    // Trigger 2: update_property_status_after_lease_end
    // Set property to Leased, create a valid lease, then mark it Terminated and verify property becomes Available
    const [[beforeProp]] = await conn.query('SELECT Status FROM Property WHERE Property_ID = ?', [propertyId]);
    results.updatePropertyStatusAfterLeaseEnd.before = beforeProp?.Status || null;

    await conn.query(`UPDATE Property SET Status = 'Leased' WHERE Property_ID = ?`, [propertyId]);
    const [leaseIns] = await conn.query(
      `INSERT INTO Lease (Property_ID, Tenant_ID, Start_Date, End_Date, Monthly_Rent, Status)
       VALUES (?, ?, DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 10 DAY), 1500, 'Active')`,
      [propertyId, tenantId]
    );
    const leaseId = leaseIns.insertId;
    await conn.query(`UPDATE Lease SET Status = 'Terminated' WHERE Lease_ID = ?`, [leaseId]);
    const [[afterProp]] = await conn.query('SELECT Status FROM Property WHERE Property_ID = ?', [propertyId]);
    results.updatePropertyStatusAfterLeaseEnd.after = afterProp?.Status || null;
    results.updatePropertyStatusAfterLeaseEnd.fired = afterProp?.Status === 'Available';

    // Trigger 3: notify_owner_insurance_response
    const [offerIns] = await conn.query(
      `INSERT INTO Insurance_Offer
       (Property_ID, Tenant_ID, Provider, Coverage_Type, Coverage_Amount, Premium_Amount, Premium_Frequency,
        Start_Date, End_Date, Terms, Benefits, Status)
       VALUES (?, ?, 'DemoProvider', 'DemoCoverage', 10000, 100, 'Monthly', CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 1 YEAR), 'Demo Terms', 'Demo Benefits', 'Pending')`,
      [propertyId, tenantId]
    );
    const offerId = offerIns.insertId;
    await conn.query(`UPDATE Insurance_Offer SET Status = 'Accepted' WHERE Offer_ID = ?`, [offerId]);
    const [notif] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM Notification WHERE Type = 'insurance' AND Related_ID = ?`,
      [offerId]
    );
    results.notifyOwnerInsuranceResponse.createdOfferId = offerId;
    results.notifyOwnerInsuranceResponse.notificationRows = notif[0]?.cnt || 0;
    results.notifyOwnerInsuranceResponse.fired = (notif[0]?.cnt || 0) > 0;

    // Rollback so the demo does not persist any data
    await conn.rollback();

    res.json({
      info: 'Executed 3 trigger demos inside a transaction and rolled back. No persistent changes.',
      context: { propertyId, tenantId, ownerId },
      results
    });
  } catch (error) {
    try { await conn.rollback(); } catch (_) {}
    console.error('Demo triggers error:', error);
    res.status(500).json({ message: error.message });
  } finally {
    conn.release();
  }
});
