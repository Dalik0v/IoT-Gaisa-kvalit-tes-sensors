import express from 'express';

const router = express.Router();

// time being, store latest measurement in memory
let latestMeasurement = {
    oxygen: 20.9,
    co2: 400,
    particles: 15,
    timestamp: new Date()
};

// WebSocket inst
let io: any;
export const setIO = (socketIO: any) => {
    io = socketIO;
};

// POST - receive new measurement data
router.post('/', (req, res) => {
    const { oxygen, co2, particles } = req.body;
    
    latestMeasurement = {
        oxygen: parseFloat(oxygen),
        co2: parseInt(co2),
        particles: parseFloat(particles),
        timestamp: new Date()
    };
    
    console.log('📊 Новое измерение:', latestMeasurement);
    
    // emit via WebSocket
    if (io) {
        io.emit('newMeasurement', latestMeasurement);
        console.log('🔌 Данные отправлены через WebSocket');
    }
    
    res.json({
        message: 'Данные получены и отправлены',
        data: latestMeasurement
    });
});

// GET - get latest measurement
router.get('/latest', (req, res) => {
    res.json(latestMeasurement);
});

export default router;