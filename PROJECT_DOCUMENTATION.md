# IoT Air Quality Sensor - Documentation

## 1. Architecture

```
Device (ESP32) → Backend (Node.js) → Database (PostgreSQL)
                      ↓
              Frontend (React)
```

- **Device**: ESP32 + SCD41 sensor, sends data via HTTPS
- **Backend**: Node.js + Express + TypeScript, REST API + WebSocket
- **Database**: PostgreSQL (Docker), 3NF normalized
- **Frontend**: React + TypeScript, real-time graphs

## 2. Database (3NF)

| Table | Purpose |
|-------|---------|
| users | User accounts |
| devices | Registered sensors (MAC address) |
| measurements | Sensor readings (CO2, temp, humidity) |

**Relations**: users ← devices ← measurements

## 3. Server Access

**Cloudflare Tunnel** - secure connection without static IP
- Auto HTTPS
- No port forwarding needed
- DDoS protection

## 4. Docker Compose

```bash
docker-compose up -d --build
```

Services: postgres, backend, frontend, cloudflared

## 5. API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/measurements | Receive sensor data |
| GET | /api/measurements/latest | Latest reading |
| GET | /api/devices | List devices |
| POST | /api/devices | Add device |

## 6. Bonus

- TypeScript (static typing)
- WebSocket (real-time)
- Multi-language (LV/RU/EN)
