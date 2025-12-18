# 🌬️ IoT Air Quality Monitoring System

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![ESP32](https://img.shields.io/badge/ESP32-E7352C?style=for-the-badge&logo=espressif&logoColor=white)](https://www.espressif.com/)

A complete IoT solution for real-time indoor air quality monitoring with ESP32 sensor, Node.js backend, React frontend, and PostgreSQL database.

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Hardware](#-hardware)
- [Tech Stack](#-tech-stack)
- [Database Schema](#-database-schema-3nf)
- [Quick Start](#-quick-start)
- [API Endpoints](#-api-endpoints)
- [Screenshots](#-screenshots)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📊 **Real-time Monitoring** | Live updates via WebSocket - no page refresh needed |
| 📈 **Interactive Charts** | Canvas-based graphs for O₂, CO₂, and particles |
| 🌐 **Multi-language** | Latvian, Russian, English support |
| 🌙 **Dark Mode** | Eye-friendly dark theme |
| 📱 **Responsive Design** | Works on desktop and mobile |
| 🔐 **User Authentication** | JWT-based login/register system |
| 💡 **LED Indicators** | Physical device shows air quality with colored LEDs |
| 🐳 **Docker Deployment** | One-command deployment with Docker Compose |

---

## 🏗️ Architecture

```
┌──────────────────┐      HTTPS         ┌─────────────────┐       SQL         ┌──────────────┐
│   📟 ESP32       │  ──────────────►  │   🖥️ Backend    │  ◄──────────►     │  🗄️ Database │
│   + SCD41        │                    │   (Node.js)     │                    │  (PostgreSQL)│
└──────────────────┘                    └─────────────────┘                    └──────────────┘
                                               │
                                               │ WebSocket (Socket.IO)
                                               ▼
                                        ┌─────────────────┐
                                        │   🌐 Frontend   │
                                        │   (React)       │
                                        └─────────────────┘
```

### Data Flow

1. **ESP32** measures air quality every 10 seconds
2. **Sensor data** sent via HTTPS to backend API
3. **Backend** validates and stores data in PostgreSQL
4. **WebSocket** broadcasts new measurements to all connected clients
5. **Frontend** updates charts and displays in real-time

---

## 🔧 Hardware

### Components

| Component | Model | Purpose |
|-----------|-------|---------|
| Microcontroller | **ESP32** | WiFi connectivity, I2C communication |
| CO₂ Sensor | **SCD41** | Measures CO₂, temperature, humidity |
| Blue LEDs | 3x | CO₂ level indicator |
| Red LEDs | 3x | Humidity level indicator |


### Wiring Diagram

```
ESP32 GPIO Pinout:
├── I2C (SCD41 Sensor)
│   ├── GPIO 21 → SDA
│   └── GPIO 22 → SCL
│
├── Blue LEDs (CO₂ Level)
│   ├── GPIO 13 → LED 1 (< 500 ppm)
│   ├── GPIO 12 → LED 2 (500-800 ppm)
│   └── GPIO 14 → LED 3 (> 800 ppm)
│
├── Red LEDs (Humidity)
│   ├── GPIO 27 → LED 1 (< 35%)
│   ├── GPIO 25 → LED 2 (35-55%)
│   └── GPIO 32 → LED 3 (> 55%)
│
└── Status LED
    └── GPIO 4 → Blink indicator
```

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Real-time:** Socket.IO
- **Database:** PostgreSQL

### Frontend
- **Library:** React 18
- **Language:** TypeScript
- **Styling:** CSS3 with CSS Variables
- **Charts:** Canvas API

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Tunnel:** Cloudflare Tunnel (HTTPS)
- **Database:** PostgreSQL 16

---

## 🗄️ Database Schema (3NF)

The database follows **Third Normal Form (3NF)** to eliminate data redundancy.

### Entity Relationship Diagram

```
<img width="1023" height="432" alt="изображение" src="https://github.com/user-attachments/assets/f256662d-d4cf-4f69-97f7-fc8935631341" />
```

### Tables

#### `users`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique user ID |
| `name` | VARCHAR(100) | NOT NULL | User's name |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User's email |
| `password` | VARCHAR(255) | NOT NULL | Hashed password |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Registration date |

#### `devices`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique device ID |
| `device_id` | VARCHAR(17) | UNIQUE, NOT NULL | MAC address (AA:BB:CC:DD:EE:FF) |
| `user_id` | INTEGER | FOREIGN KEY → users | Device owner |
| `name` | VARCHAR(100) | NOT NULL | Device name |
| `location` | VARCHAR(255) | | Device location |
| `is_active` | BOOLEAN | DEFAULT true | Active status |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Registration date |

#### `measurements`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique measurement ID |
| `device_id` | INTEGER | FOREIGN KEY → devices | Source device |
| `oxygen` | DECIMAL(5,2) | | O₂ percentage |
| `co2` | INTEGER | | CO₂ in ppm |
| `particles` | DECIMAL(6,2) | | PM2.5 in μg/m³ |
| `temperature` | DECIMAL(4,1) | | Temperature in °C |
| `humidity` | DECIMAL(4,1) | | Humidity in % |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Measurement time |

### 3NF Compliance

| Normal Form | Requirement | Status |
|-------------|-------------|--------|
| **1NF** | Atomic values, no repeating groups | ✅ |
| **2NF** | No partial dependencies on composite key | ✅ |


---

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Dalik0v/IoT-Gaisa-kvalit-tes-sensors.git
cd IoT-Gaisa-kvalit-tes-sensors

# 2. Create environment file
cp .env.example .env
# Edit .env with your settings

# 3. Start all services
docker-compose up -d --build

# 4. Access the application
# Frontend: http://localhost
# Backend:  http://localhost:8080
```

### Docker Services

| Service | Port | Description |
|---------|------|-------------|
| `postgres` | 5432 | PostgreSQL database |
| `backend` | 8080 | Node.js API server |
| `frontend` | 80 | React web application |
| `cloudflared` | - | Cloudflare tunnel (optional) |

---

## 📡 API Endpoints

### Measurements

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/measurements` | Submit new measurement (from ESP32) |
| `GET` | `/api/measurements/latest` | Get latest measurement |
| `GET` | `/api/measurements/history?limit=50` | Get measurement history |

### Devices

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/devices` | List all devices |
| `POST` | `/api/devices` | Register new device |
| `DELETE` | `/api/devices/:id` | Remove a device |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create new account |
| `POST` | `/api/auth/login` | Login and get JWT token |
| `GET` | `/api/auth/profile` | Get user profile |

---

## 📸 Screenshots

### Dashboard
Real-time air quality monitoring with interactive charts.

### Device Management
Add, edit, and remove IoT sensors.

### Multi-language Support
Switch between Latvian, Russian, and English.

---

## 📄 Project Structure

```
IoT-Gaisa-kvalit-tes-sensors/
├── arduino_code_iphone.ino    # ESP32 Arduino code
├── backend/                   # Node.js backend
│   ├── src/
│   │   ├── server.ts         # Main server file
│   │   ├── config/           # Database configuration
│   │   └── routes/           # API routes
│   └── Dockerfile
├── frontend/my-react-app/     # React frontend
│   ├── src/
│   │   ├── App.tsx           # Main component
│   │   ├── pages/            # Page components
│   │   └── components/       # Reusable components
│   └── Dockerfile
├── docker-compose.yml         # Docker orchestration
├── config.yml                 # Cloudflare tunnel config
└── README.md
```

---

## 🎓 Academic Project

This project was developed as a qualification work demonstrating:

- **IoT Development** — ESP32 microcontroller programming
- **Full-Stack Development** — React + Node.js + PostgreSQL
- **Database Design** — Third Normal Form (3NF)
- **DevOps** — Docker containerization
- **Real-time Communication** — WebSocket implementation

---

## 📝 License

This project is created for educational purposes.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Dalik0v">Dalik0v</a>
</p>
