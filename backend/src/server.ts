import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import measurementsRouter, { setIO } from './routes/measurements';
import devicesRouter from './routes/devices';
import authRouter from './routes/auth';

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

// Initialize WebSocket in measurements router
setIO(io);

app.use(cors());
app.use(express.json());

app.use('/api/measurements', measurementsRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/auth', authRouter);

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Backend is running',
        timestamp: new Date()
    });
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

httpServer.listen(PORT, () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Backend is online!');
    console.log(`📡 Server: http://localhost:5000`);
    console.log(`🔌 WebSocket: ws://localhost:5000`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});