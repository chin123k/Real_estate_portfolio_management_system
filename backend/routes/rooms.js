const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all rooms
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Room ORDER BY Property_ID, Room_Number');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Get PG properties with available rooms (NESTED QUERY with GUI)
router.get('/pg-properties-available', async (req, res) => {
  try {
    const [properties] = await db.query(
      `SELECT 
        p.*,
        CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
        (SELECT COUNT(*) FROM Room WHERE Property_ID = p.Property_ID) AS Total_Rooms,
        (SELECT COUNT(*) FROM Room WHERE Property_ID = p.Property_ID AND Status = 'Available') AS Available_Rooms,
        (SELECT MIN(Rent_Per_Month) FROM Room WHERE Property_ID = p.Property_ID) AS Min_Rent,
        (SELECT MAX(Rent_Per_Month) FROM Room WHERE Property_ID = p.Property_ID) AS Max_Rent
       FROM property p
       LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID
       WHERE p.Is_PG = TRUE
       AND p.Property_ID IN (
         SELECT DISTINCT Property_ID 
         FROM Room 
         WHERE Status = 'Available'
       )
       ORDER BY p.Created_At DESC`
    );
    res.json(properties);
  } catch (error) {
    console.error('Error fetching PG properties:', error);
    res.status(500).json({ error: 'Failed to fetch PG properties' });
  }
});

// Get rooms by property ID
router.get('/property/:propertyId', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, 
        CONCAT(r.Current_Occupancy, '/', r.Occupancy_Capacity) as Occupancy_Status
       FROM Room r 
       WHERE r.Property_ID = ?
       ORDER BY r.Room_Number`,
      [req.params.propertyId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Get single room
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Room WHERE Room_ID = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// Create new room
router.post('/', async (req, res) => {
  try {
    const {
      Property_ID,
      Room_Number,
      Room_Type,
      Occupancy_Capacity,
      Rent_Per_Month,
      Amenities
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO Room (Property_ID, Room_Number, Room_Type, Occupancy_Capacity, Rent_Per_Month, Amenities)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [Property_ID, Room_Number, Room_Type, Occupancy_Capacity || 1, Rent_Per_Month, Amenities]
    );

    res.status(201).json({
      message: 'Room created successfully',
      roomId: result.insertId
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Update room
router.put('/:id', async (req, res) => {
  try {
    const {
      Room_Number,
      Room_Type,
      Occupancy_Capacity,
      Current_Occupancy,
      Rent_Per_Month,
      Status,
      Amenities
    } = req.body;

    const [result] = await db.query(
      `UPDATE Room 
       SET Room_Number = ?, Room_Type = ?, Occupancy_Capacity = ?, 
           Current_Occupancy = ?, Rent_Per_Month = ?, Status = ?, Amenities = ?
       WHERE Room_ID = ?`,
      [Room_Number, Room_Type, Occupancy_Capacity, Current_Occupancy, Rent_Per_Month, Status, Amenities, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ message: 'Room updated successfully' });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// Delete room
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM Room WHERE Room_ID = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

module.exports = router;
