const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all payments (Owner view - unscoped, legacy)
router.get('/owner', async (req, res) => {
  try {
    const [payments] = await db.query(`
      SELECT p.*, 
        CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
        t.Email as Tenant_Email,
        pr.Property_Name,
        l.Monthly_Rent,
        l.Lease_ID
      FROM Payment p
      JOIN Lease l ON p.Lease_ID = l.Lease_ID
      JOIN Tenant t ON l.Tenant_ID = t.Tenant_ID
      JOIN Property pr ON l.Property_ID = pr.Property_ID
      ORDER BY 
        CASE p.Status 
          WHEN 'Pending' THEN 1 
          WHEN 'Overdue' THEN 2 
          ELSE 3 
        END,
        p.Due_Date DESC
    `);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get payments for specific tenant (Tenant view)
router.get('/tenant/:tenantId', async (req, res) => {
  try {
    const [payments] = await db.query(`
      SELECT p.*, 
        pr.Property_Name,
        pr.Street_Address,
        l.Monthly_Rent
      FROM Payment p
      JOIN Lease l ON p.Lease_ID = l.Lease_ID
      JOIN Property pr ON l.Property_ID = pr.Property_ID
      WHERE l.Tenant_ID = ?
      ORDER BY p.Payment_Date DESC
    `, [req.params.tenantId]);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get pending payments for tenant
router.get('/tenant/:tenantId/pending', async (req, res) => {
  try {
    const [payments] = await db.query(`
      SELECT p.*, 
        pr.Property_Name,
        pr.Street_Address,
        l.Monthly_Rent
      FROM Payment p
      JOIN Lease l ON p.Lease_ID = l.Lease_ID
      JOIN Property pr ON l.Property_ID = pr.Property_ID
      WHERE l.Tenant_ID = ? AND p.Status = 'Pending'
      ORDER BY p.Due_Date ASC
    `, [req.params.tenantId]);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper to normalize any incoming date/time value to 'YYYY-MM-DD'
function normalizeDateLike(value) {
  try {
    if (!value) return new Date().toISOString().slice(0, 10);
    if (typeof value === 'string') {
      // If it's already 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm:ssZ', take the date part
      const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) return m[1];
      const d = new Date(value);
      if (!isNaN(d.getTime())) return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }
    if (value instanceof Date) {
      return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }
  } catch {}
  // Fallback to today
  return new Date().toISOString().slice(0, 10);
}

// Create a new payment (Tenant action - submitting payment)
router.post('/', async (req, res) => {
  const {
    Lease_ID,
    Amount,
    Payment_Date,
    Payment_Method,
    Due_Date,
    Notes
  } = req.body;

  try {
    const paymentDateYmd = normalizeDateLike(Payment_Date);
    const dueDateYmd = normalizeDateLike(Due_Date);

    // Derive tenant from Lease for compatibility with legacy schemas
    const [leaseRows] = await db.query(
      `SELECT Tenant_ID FROM Lease WHERE Lease_ID = ? LIMIT 1`,
      [Lease_ID]
    );
    const derivedTenantId = leaseRows && leaseRows[0] ? leaseRows[0].Tenant_ID : null;

    // Detect if Payment.Tenant_ID still exists (pre-migration DB)
    const [colRows] = await db.query(
      `SELECT COUNT(*) AS c
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'Payment' 
         AND COLUMN_NAME = 'Tenant_ID'`
    );
    const hasLegacyTenantCol = colRows && colRows[0] && Number(colRows[0].c) > 0;

    let result;
    if (hasLegacyTenantCol) {
      // Insert with Tenant_ID for legacy DBs
      [result] = await db.query(
        `INSERT INTO Payment (Lease_ID, Tenant_ID, Amount, Payment_Date, Payment_Method, Status, Due_Date, Notes)
         VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?)`,
        [Lease_ID, derivedTenantId, Amount, paymentDateYmd, Payment_Method, dueDateYmd, Notes]
      );
    } else {
      // Insert without Tenant_ID for 3NF schema
      [result] = await db.query(
        `INSERT INTO Payment (Lease_ID, Amount, Payment_Date, Payment_Method, Status, Due_Date, Notes)
         VALUES (?, ?, ?, ?, 'Pending', ?, ?)`,
        [Lease_ID, Amount, paymentDateYmd, Payment_Method, dueDateYmd, Notes]
      );
    }

    // Best-effort: create notification for owner (don't fail payment if notifications table or join isn't available)
    try {
      await db.query(
        `INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
         SELECT 'Owner', p.Owner_ID, 'New Payment Submitted', 
                CONCAT('Payment of $', ?, ' submitted by tenant'),
                'payment', ?
         FROM Lease l
         JOIN Property p ON l.Property_ID = p.Property_ID
         WHERE l.Lease_ID = ? AND p.Owner_ID IS NOT NULL
         LIMIT 1`,
        [Amount, result.insertId, Lease_ID]
      );
    } catch (notifyErr) {
      console.warn('Payment created but failed to insert owner notification:', notifyErr.message);
    }

    res.status(201).json({ 
      Payment_ID: result.insertId, 
      message: 'Payment submitted successfully',
      ...req.body 
    });
  } catch (error) {
    console.error('Error submitting payment:', error);
    res.status(500).json({ message: 'Failed to submit payment', detail: error.message });
  }
});

// Update payment status (Owner action - confirming payment)
router.put('/:id', async (req, res) => {
  const {
    Status,
    Notes,
    Late_Fee
  } = req.body;

  try {
    const normalizedStatus = (Status || '').trim();
    const lateFeeNumber = isNaN(Number(Late_Fee)) ? 0 : Number(Late_Fee);
    // Get current payment details before update
    const [paymentRows] = await db.query(
      `SELECT p.*, l.Property_ID 
       FROM Payment p 
       JOIN Lease l ON p.Lease_ID = l.Lease_ID
       WHERE p.Payment_ID = ?`,
      [req.params.id]
    );
    // Also set Payment_Date to current date if marking as Paid and no date set
    const [result] = await db.query(
      `UPDATE Payment 
       SET Status = ?, Notes = ?, Late_Fee = ?, 
           Payment_Date = CASE WHEN ? = 'Paid' THEN CURDATE() ELSE Payment_Date END
       WHERE Payment_ID = ?`,
      [normalizedStatus, Notes, lateFeeNumber, normalizedStatus, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // If status changed to Paid, notify tenant and credit owner via Financial_Transaction
    if (paymentRows.length > 0 && paymentRows[0].Status !== normalizedStatus && normalizedStatus === 'Paid') {
      const p = paymentRows[0];
      const totalAmount = Number(p.Amount || 0) + Number(lateFeeNumber || p.Late_Fee || 0);

      // Record financial transaction as income for owner (by property)
      try {
        await db.query(
          `INSERT INTO Financial_Transaction 
           (Property_ID, Transaction_Type, Amount, Transaction_Date, Description, Category)
           VALUES (?, 'Income', ?, CURDATE(), ?, 'Rent')`,
          [p.Property_ID, totalAmount, `Rent Payment - Lease #${p.Lease_ID} via ${p.Payment_Method || 'Bank Transfer'}`]
        );
      } catch (e) {
        // log and continue without failing the request
        console.error('Failed to insert Financial_Transaction for payment', req.params.id, e);
      }

      // Notify the tenant derived from Lease
      await db.query(
        `INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
         SELECT 'Tenant', l.Tenant_ID, 'Payment Confirmed', 
                'Your payment has been confirmed and processed',
                'payment', ?
         FROM Lease l WHERE l.Lease_ID = ?`,
        [req.params.id, p.Lease_ID]
      );
    }

    // Return the updated record for immediate UI refresh
    const [updatedRows] = await db.query(
      `SELECT p.*, pr.Property_Name, pr.Street_Address, l.Monthly_Rent,
        CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
        t.Email as Tenant_Email
       FROM Payment p
       JOIN Lease l ON p.Lease_ID = l.Lease_ID
       JOIN Property pr ON l.Property_ID = pr.Property_ID
       JOIN Tenant t ON l.Tenant_ID = t.Tenant_ID
       WHERE p.Payment_ID = ?`,
      [req.params.id]
    );

    res.json({ 
      Payment_ID: req.params.id, 
      message: 'Payment updated successfully',
      payment: updatedRows && updatedRows[0] ? updatedRows[0] : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a payment
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM Payment WHERE Payment_ID = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get payment statistics across all owners (legacy/unscoped)
router.get('/owner/stats', async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN Status = 'Paid' THEN Amount ELSE 0 END) as total_received,
        SUM(CASE WHEN Status = 'Pending' THEN Amount ELSE 0 END) as total_pending,
        SUM(CASE WHEN Status = 'Overdue' THEN Amount ELSE 0 END) as total_overdue,
        SUM(Late_Fee) as total_late_fees
      FROM Payment
    `);
    res.json(stats[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get payments for a specific owner (scoped)
router.get('/owner/:ownerId', async (req, res) => {
  try {
    const [payments] = await db.query(`
      SELECT p.*, 
        CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
        t.Email as Tenant_Email,
        pr.Property_Name,
        l.Monthly_Rent,
        l.Lease_ID
      FROM Payment p
      JOIN Lease l ON p.Lease_ID = l.Lease_ID
      JOIN Tenant t ON l.Tenant_ID = t.Tenant_ID
      JOIN Property pr ON l.Property_ID = pr.Property_ID
      WHERE pr.Owner_ID = ?
      ORDER BY 
        CASE p.Status 
          WHEN 'Pending' THEN 1 
          WHEN 'Overdue' THEN 2 
          ELSE 3 
        END,
        p.Due_Date DESC
    `, [req.params.ownerId]);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get payment statistics for a specific owner (scoped)
router.get('/owner/:ownerId/stats', async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN p.Status = 'Paid' THEN p.Amount ELSE 0 END) as total_received,
        SUM(CASE WHEN p.Status = 'Pending' THEN p.Amount ELSE 0 END) as total_pending,
        SUM(CASE WHEN p.Status = 'Overdue' THEN p.Amount ELSE 0 END) as total_overdue,
        SUM(p.Late_Fee) as total_late_fees
      FROM Payment p
      JOIN Lease l ON p.Lease_ID = l.Lease_ID
      JOIN Property pr ON l.Property_ID = pr.Property_ID
      WHERE pr.Owner_ID = ?
    `, [req.params.ownerId]);
    res.json(stats && stats[0] ? stats[0] : {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
