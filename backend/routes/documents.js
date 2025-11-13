const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all documents for a tenant
router.get('/tenant/:tenantId', async (req, res) => {
  try {
    const [documents] = await db.query(`
      SELECT pd.*, p.Property_Name
      FROM Property_Document pd
      JOIN Property p ON pd.Property_ID = p.Property_ID
      JOIN Lease l ON p.Property_ID = l.Property_ID
      WHERE l.Tenant_ID = ? AND (l.Status = 'Active' OR l.Status IS NULL)
      ORDER BY pd.Upload_Date DESC
    `, [req.params.tenantId]);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all documents for owner to view (all properties owned)
router.get('/owner/:ownerId', async (req, res) => {
  try {
    console.log('Fetching documents for owner:', req.params.ownerId);
    
    const [documents] = await db.query(`
      SELECT pd.*, p.Property_Name, p.Owner_ID,
             CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
             t.Email as Tenant_Email
      FROM Property_Document pd
      JOIN Property p ON pd.Property_ID = p.Property_ID
      LEFT JOIN Lease l ON p.Property_ID = l.Property_ID AND (l.Status = 'Active' OR l.Status IS NULL)
      LEFT JOIN Tenant t ON l.Tenant_ID = t.Tenant_ID
      WHERE p.Owner_ID = ?
      ORDER BY pd.Upload_Date DESC
    `, [req.params.ownerId]);
    
    console.log(`Found ${documents.length} documents for owner ${req.params.ownerId}`);
    
    res.json(documents);
  } catch (error) {
    console.error('Error fetching owner documents:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all documents for a property
router.get('/property/:propertyId', async (req, res) => {
  try {
    const [documents] = await db.query(
      'SELECT * FROM Property_Document WHERE Property_ID = ? ORDER BY Upload_Date DESC',
      [req.params.propertyId]
    );
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload a new document
router.post('/', async (req, res) => {
  console.log('Document upload request received:', {
    Property_ID: req.body.Property_ID,
    Document_Type: req.body.Document_Type,
    Document_Name: req.body.Document_Name,
    Tenant_ID: req.body.Tenant_ID,
    hasFileData: !!req.body.File_Data
  });

  const { Property_ID, Document_Type, Document_Name, File_Path, File_Data, File_Name, File_Type, Tenant_ID } = req.body;

  if (!Property_ID || !Document_Name) {
    console.log('Validation failed: Missing Property_ID or Document_Name');
    return res.status(400).json({ message: 'Property ID and Document Name are required' });
  }

  try {
    let filePath = File_Path || `/documents/${Document_Name.replace(/\s+/g, '_')}`;
    
    // If file data is provided, we could save it to disk or cloud storage
    // For now, we'll just store the path and metadata
    if (File_Data) {
      // Here you could implement actual file storage
      // For example, save to filesystem or cloud storage
      // filePath would be the actual saved location
      console.log(`File uploaded: ${File_Name}, Type: ${File_Type}, Size: ${File_Data.length} bytes`);
    }
    
    console.log('Inserting document into database:', { Property_ID, Document_Type, Document_Name, filePath });
    
    const [result] = await db.query(
      `INSERT INTO Property_Document (Property_ID, Document_Type, Document_Name, File_Path)
       VALUES (?, ?, ?, ?)`,
      [Property_ID, Document_Type, Document_Name, filePath]
    );

    console.log('Document inserted successfully, ID:', result.insertId);

    // If Tenant_ID is provided, we can track which tenant uploaded the document
    // You could add a Tenant_ID column to Property_Document table if needed

    res.status(201).json({
      Document_ID: result.insertId,
      Property_ID,
      Document_Type,
      Document_Name,
      File_Path: filePath,
      message: 'Document uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete a document
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM Property_Document WHERE Document_ID = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
