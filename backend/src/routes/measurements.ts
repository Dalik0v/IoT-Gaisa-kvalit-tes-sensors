import express from 'express';
import pool from '../config/database';

const router = express.Router();

let io: any;

export const setIO = (socketIO: any) => {
    io = socketIO;
};

router.post('/', async (req, res) => {
    try {
        const { device_id, oxygen, co2, particles, temperature, humidity } = req.body;

        // Validate device_id (MAC address) if provided
        if (device_id) {
            const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
            if (!macRegex.test(device_id)) {
                return res.status(400).json({ error: 'Invalid device_id (MAC address) format' });
            }

            // Normalize MAC address
            const normalizedMac = device_id.toUpperCase().replace(/-/g, ':');

            // Check if device exists, if not - auto-register it
            let deviceCheck = await pool.query(
                'SELECT id FROM devices WHERE device_id = $1',
                [normalizedMac]
            );

            let deviceDbId: number;

            if (deviceCheck.rows.length === 0) {
                // Auto-register the device
                console.log(`Auto-registering new device: ${normalizedMac}`);
                const newDevice = await pool.query(
                    `INSERT INTO devices (device_id, name, location, is_active, created_at)
                     VALUES ($1, $2, $3, true, NOW())
                     RETURNING id`,
                    [normalizedMac, 'Auto-registered Sensor', 'Unknown']
                );
                deviceDbId = newDevice.rows[0].id;
                console.log(`Device registered with ID: ${deviceDbId}`);
            } else {
                deviceDbId = deviceCheck.rows[0].id;
            }

            // Try to insert with device_id (integer ID from devices table)
            try {
                const result = await pool.query(
                    `INSERT INTO measurements (device_id, oxygen, co2, particles, temperature, humidity, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())
                     RETURNING *`,
                    [deviceDbId, oxygen, co2, particles, temperature || null, humidity || null]
                );

                const measurement = result.rows[0];
                console.log('New measurement saved:', measurement);

                if (io) {
                    io.emit('newMeasurement', {
                        oxygen: parseFloat(oxygen),
                        co2: parseInt(co2),
                        particles: parseFloat(particles),
                        timestamp: measurement.created_at || measurement.timestamp
                    });
                    console.log('Data sent via WebSocket');
                }

                return res.json({ message: 'Data saved', data: measurement });
            } catch (dbError: any) {
                // If device_id column doesn't exist, try without it
                if (dbError.code === '42703' || dbError.message?.includes('column') || dbError.message?.includes('device_id')) {
                    console.log('device_id column not found, inserting without it');
                    const result = await pool.query(
                        `INSERT INTO measurements (oxygen, co2, particles, temperature, humidity, created_at)
                         VALUES ($1, $2, $3, $4, $5, NOW())
                         RETURNING *`,
                        [oxygen, co2, particles, temperature || null, humidity || null]
                    );

                    const measurement = result.rows[0];
                    console.log('New measurement saved (without device_id):', measurement);

                    if (io) {
                        io.emit('newMeasurement', {
                            oxygen: parseFloat(oxygen),
                            co2: parseInt(co2),
                            particles: parseFloat(particles),
                            timestamp: measurement.created_at || measurement.timestamp
                        });
                        console.log('Data sent via WebSocket');
                    }

                    return res.json({ message: 'Data saved', data: measurement });
                }
                throw dbError;
            }
        } else {
            // No device_id provided, insert without it
            const result = await pool.query(
                `INSERT INTO measurements (oxygen, co2, particles, temperature, humidity, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())
                 RETURNING *`,
                [oxygen, co2, particles, temperature || null, humidity || null]
            );

            const measurement = result.rows[0];
            console.log('New measurement saved:', measurement);

            if (io) {
                io.emit('newMeasurement', {
                    oxygen: parseFloat(oxygen),
                    co2: parseInt(co2),
                    particles: parseFloat(particles),
                    timestamp: measurement.created_at || measurement.timestamp
                });
                console.log('Data sent via WebSocket');
            }

            return res.json({ message: 'Data saved', data: measurement });
        }
    } catch (error: any) {
        console.error('Error saving measurement:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            detail: error.detail,
            hint: error.hint
        });
        res.status(500).json({
            error: 'Failed to save',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.get('/latest', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM measurements ORDER BY created_at DESC LIMIT 1'
        );

        if (result.rows.length === 0) {
            return res.json({ oxygen: 20.9, co2: 400, particles: 15, created_at: new Date() });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to get data' });
    }
});

router.get('/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const result = await pool.query(
            'SELECT * FROM measurements ORDER BY created_at DESC LIMIT $1',
            [limit]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
});

export default router;