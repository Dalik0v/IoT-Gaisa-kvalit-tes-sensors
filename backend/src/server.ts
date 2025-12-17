import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import measurementsRouter, { setIO } from './routes/measurements';
import devicesRouter from './routes/devices';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});

// Передаём io в роуты
setIO(io);

app.use(cors());
app.use(express.json());

app.use('/api/measurements', measurementsRouter);
app.use('/api/devices', devicesRouter);

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Backend работает!',
        timestamp: new Date()
    });
});

io.on('connection', (socket) => {
    console.log('🔌 Клиент подключился:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('❌ Клиент отключился:', socket.id);
    });
});

httpServer.listen(PORT, () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Backend запущен!');
    console.log(`📡 Server: http://localhost:5000`);
    console.log(`🔌 WebSocket: ws://localhost:5000`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});