import express from 'express';
import pool from '../config/database';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM devices ORDER BY created_at DESC');
        res.json({ devices: result.rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to get devices' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, location, macAddress, user_id } = req.body;

        // Validate MAC address format
        if (!macAddress) {
            return res.status(400).json({ error: 'MAC address is required' });
        }

        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        if (!macRegex.test(macAddress)) {
            return res.status(400).json({ error: 'Invalid MAC address format. Use format: XX:XX:XX:XX:XX:XX' });
        }

        // Normalize MAC address (uppercase, colons)
        const normalizedMac = macAddress.toUpperCase().replace(/-/g, ':');
        
        // Use MAC address as device_id
        const device_id = normalizedMac;

        // Check if device with this MAC already exists
        const existingDevice = await pool.query(
            'SELECT * FROM devices WHERE device_id = $1',
            [device_id]
        );

        if (existingDevice.rows.length > 0) {
            return res.status(409).json({ error: 'Device with this MAC address already exists' });
        }

        const result = await pool.query(
            `INSERT INTO devices (device_id, name, location, user_id, is_active, created_at)
             VALUES ($1, $2, $3, $4, true, NOW())
             RETURNING *`,
            [device_id, name || 'Air Quality Sensor', location || 'Unknown', user_id || null]
        );

        console.log('New device:', result.rows[0]);
        res.status(201).json({ message: 'Device added', device: result.rows[0] });
    } catch (error: any) {
        console.error('Error adding device:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });
        
        // Provide more specific error messages
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Device with this MAC address already exists' });
        }
        if (error.code === '28P01' || error.message?.includes('password')) {
            return res.status(500).json({ error: 'Database connection error. Please check database configuration.' });
        }
        if (error.code === 'ECONNREFUSED') {
            return res.status(500).json({ error: 'Cannot connect to database. Please check if database is running.' });
        }
        
        res.status(500).json({ 
            error: 'Failed to add device',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM devices WHERE id = $1', [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }
        
        res.json({ device: result.rows[0] });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to get device' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM devices WHERE id = $1 RETURNING *', [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }
        
        res.json({ message: 'Device deleted', device: result.rows[0] });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to delete device' });
    }
});

export default router;