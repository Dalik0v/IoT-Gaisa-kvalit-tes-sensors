import express from 'express';

const router = express.Router();

// Временное хранилище
let latestMeasurement = {
    oxygen: 20.9,
    co2: 400,
    particles: 15,
    timestamp: new Date()
};

// Функция для установки io (вызовем из server.ts)
let io: any;
export const setIO = (socketIO: any) => {
    io = socketIO;
};

// POST - получить данные от ESP32
router.post('/', (req, res) => {
    const { oxygen, co2, particles } = req.body;
    
    latestMeasurement = {
        oxygen: parseFloat(oxygen),
        co2: parseInt(co2),
        particles: parseFloat(particles),
        timestamp: new Date()
    };
    
    console.log('📊 Новое измерение:', latestMeasurement);
    
    // Отправляем через WebSocket всем подключенным клиентам
    if (io) {
        io.emit('newMeasurement', latestMeasurement);
        console.log('🔌 Данные отправлены через WebSocket');
    }
    
    res.json({
        message: 'Данные получены и отправлены',
        data: latestMeasurement
    });
});

// GET - получить последние данные
router.get('/latest', (req, res) => {
    res.json(latestMeasurement);
});

export default router;