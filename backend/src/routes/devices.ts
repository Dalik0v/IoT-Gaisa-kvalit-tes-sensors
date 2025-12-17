import express from 'express';

const router = express.Router();


interface Device {
    id: string;
    name: string;
    location: string;
    createdAt: Date;
}

let devices: Device[] = [];

router.get('/', (req, res) => {
    res.json({ devices });
});

router.post('/', (req, res) => {
    const { name, location } = req.body;
    
    const id = `ESP32-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    const newDevice: Device = {
        id,
        name: name || 'Air Quality Sensor',
        location: location || 'Unknown',
        createdAt: new Date()
    };
    
    devices.push(newDevice);
    
    console.log('📱 Новое устройство:', newDevice);
    
    res.status(201).json({
        message: 'Устройство добавлено',
        device: newDevice
    });
});


router.get('/:id', (req, res) => {
    const device = devices.find(d => d.id === req.params.id);
    
    if (!device) {
        return res.status(404).json({ error: 'Устройство не найдено' });
    }
    
    res.json({ device });
});

router.delete('/:id', (req, res) => {
    const index = devices.findIndex(d => d.id === req.params.id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Устройство не найдено' });
    }
    
    const deleted = devices.splice(index, 1)[0];
    
    console.log('🗑️ Устройство удалено:', deleted);
    
    res.json({
        message: 'Устройство удалено',
        device: deleted
    });
});

export default router;