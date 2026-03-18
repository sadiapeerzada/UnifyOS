# 🚨 UnifyOS — Crisis Coordination Platform

> **Real-time emergency response for hospitality venues, powered by IoT + AI**

[![Google Solution Challenge 2026](https://img.shields.io/badge/Google%20Solution%20Challenge-2026-4285F4?style=flat&logo=google)](https://developers.google.com/community/gdsc-solution-challenge)
[![SDG 3](https://img.shields.io/badge/SDG-3%20Good%20Health-4CAF50?style=flat)](https://sdgs.un.org/goals/goal3)
[![SDG 10](https://img.shields.io/badge/SDG-10%20Reduced%20Inequalities-E91E63?style=flat)](https://sdgs.un.org/goals/goal10)
[![SDG 11](https://img.shields.io/badge/SDG-11%20Safe%20Cities-2196F3?style=flat)](https://sdgs.un.org/goals/goal11)
[![SDG 17](https://img.shields.io/badge/SDG-17%20Partnerships-607D8B?style=flat)](https://sdgs.un.org/goals/goal17)

---

## 📖 What is UnifyOS?

UnifyOS is a real-time crisis coordination platform that unifies **guests, staff, and emergency responders** in a single command centre during building emergencies.

Hotels, hospitals, schools and convention centres face a critical gap — when an emergency strikes, information is fragmented. Guests don't know where to go. Staff don't know who needs help. Responders arrive blind.

UnifyOS fixes this with an IoT Smart Panic Button that detects threats automatically and a mobile dashboard that guides staff through a structured evacuation — all in under 3 seconds.

---

## 🎯 The Problem

- **50,000+** registered hotels in India alone face unpredictable emergencies
- Average emergency coordination delay: **3–5 minutes**
- A 30-second improvement in response time reduces casualties by **40%** (NFPA data)
- Current systems are siloed — fire alarms ring everywhere but tell nobody where or what to do

---

## ✅ The Solution

```
Smart Panic Button (ESP32)
        ↓ HTTP POST every 1 second
   Node.js Backend
        ↓ AI Anomaly Detection Engine
        ↓ Gemini AI Incident Summary
        ↓ WebSocket broadcast
   React Native Mobile App
        ↓ CRITICAL alert fires
   6-Step Evacuation Checklist
        ↓ Incident logged
   Firebase + MongoDB
```

---

## 🔧 Hardware — Smart Panic Button

Wall-mounted IoT device with 4 sensors in a 3D printed enclosure.

| Component | Purpose |
|-----------|---------|
| ESP32 DevKit V1 | Microcontroller + WiFi |
| MQ-2 Sensor | Smoke + gas detection |
| DHT22 | Temperature monitoring |
| HC-SR501 PIR | Occupancy tracking |
| Red Panic Button | Manual SOS trigger |
| LEDs + Buzzer | Local status feedback |

**Cost per device: ₹3,200** — 10x cheaper than traditional fire alarm systems

### How it works
Every second, the ESP32 reads all 4 sensors and sends data to the backend:
```json
{
  "temperature": 28.5,
  "smoke": 145,
  "motion": 1,
  "button": 0,
  "deviceId": "device-001"
}
```

---

## 📱 Software — Mobile Dashboard

Built with React Native + Expo. Works on any phone via Expo Go — no app store needed.

### Key Features
- **Live sensor dashboard** — real-time readings from all devices
- **AI anomaly detection** — dynamic baseline calibration + confidence scoring
- **Gemini AI summaries** — *"Smoke detected in Main Lobby. Evacuate east stairwell immediately."*
- **6-step evacuation protocol** — structured checklist with timestamps and role assignment
- **Multi-device support** — entire building on one dashboard
- **Alert history** — persists across sessions, exportable
- **Emergency contacts** — one-tap Call 112 / 101 / 102
- **Incident logging** — full report auto-generated after every emergency

### AI Anomaly Detection
```
Confidence scoring:
TEMP > baseline + 15°C     → +30%
TEMP spike rate > 3°C/s    → +20%
SMOKE > baseline + 250ppm  → +30%
SMOKE spike rate > 80%     → +20%
Button pressed             → +15%
Multiple sensors agree     → +5%

80%+  → CRITICAL → Evacuate immediately
50–79% → HIGH → Alert staff now
20–49% → MEDIUM → Monitor closely
0–19%  → NORMAL → All clear
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile Frontend | React Native + Expo |
| Backend | Node.js + Express |
| Database | MongoDB |
| Realtime | WebSocket |
| Authentication | Firebase Auth |
| AI Summaries | Google Gemini API |
| Push Alerts | Firebase Cloud Messaging |
| User Data | Firebase Firestore |
| Hardware | ESP32 + Arduino IDE |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm
- Expo Go app on your phone
- MongoDB connection string
- Firebase project credentials
- Gemini API key (free at aistudio.google.com)

### Installation

```bash
# Clone the repo
git clone https://github.com/sadiapeerzada/UnifyOS.git
cd UnifyOS

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Fill in your credentials (see Environment Variables below)

# Start the app
pnpm dev
```

### Environment Variables

Create a `.env` file in the root:

```env
# Backend
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
PORT=3000

# Frontend
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

### Hardware Setup

1. Install Arduino IDE from arduino.cc
2. Add ESP32 board support via Boards Manager
3. Install libraries: `LiquidCrystal I2C`, `Blynk`, `DHT sensor library`
4. Wire components following the Phase 1 guide
5. Update credentials in the sketch and upload to ESP32

---

## 📡 API Endpoints

### Hardware Data Endpoint
```
POST /api/sensor-data
```
```json
{
  "temperature": 28.5,
  "smoke": 145,
  "motion": 1,
  "button": 0,
  "deviceId": "device-001"
}
```
Response:
```json
{
  "status": "ok",
  "severity": "NORMAL",
  "confidence": 0,
  "message": "All systems normal",
  "location": "Main Lobby",
  "aiSummary": "..."
}
```

### Status Endpoint
```
GET /api/status
```
Returns current system status, last hardware ping, and connected device count.

---

## 🏗️ Hardware Build Phases

| Phase | What | Status |
|-------|------|--------|
| Phase 1 | ESP32 + MQ-2 + LCD + Buzzer | In progress |
| Phase 2 | Add DHT22 + PIR + Panic Button | Upcoming |
| Phase 3 | Perfboard + 3D Printed Enclosure | Upcoming |

---

## 🗂️ Project Structure

```
UnifyOS/
├── artifacts/
│   ├── mobile/          # React Native Expo app
│   │   ├── app/         # Screens and navigation
│   │   ├── components/  # Reusable components
│   │   ├── context/     # Auth + sensor context
│   │   └── services/    # API + sensor services
│   └── server/          # Node.js backend
│       ├── routes/      # API routes
│       ├── services/    # Anomaly detection + Gemini
│       └── models/      # MongoDB models
├── hardware/            # ESP32 Arduino code
└── docs/                # Build guides
```

---

## 🌍 SDG Alignment

| Goal | Impact |
|------|--------|
| **SDG 3** — Good Health & Well-being | Faster response = fewer deaths |
| **SDG 10** — Reduced Inequalities | Accessibility for disabled guests, multilingual support |
| **SDG 11** — Sustainable Cities & Communities | Smart venue infrastructure |
| **SDG 17** — Partnerships for the Goals | Integrates with 911, hotel systems |

---

## 👥 Team BlackBit

| Name | Role |
|------|------|
| Alisha Hasan | Co-founder & Developer |
| Asna Mirza | Co-founder & Developer |
| Sadia Peerzada | Co-founder & Developer |
| Sadia Zafreen | Co-founder & Developer |

---

## 📊 Roadmap

- [x] App foundation built
- [x] Firebase Auth configured
- [x] Gemini API integrated
- [x] Anomaly detection engine
- [x] Evacuation protocol
- [ ] Hardware Phase 1 (parts arriving)
- [ ] Hardware Phase 2
- [ ] Hardware ↔ App integration
- [ ] 3D printed enclosure
- [ ] Vercel + Render deployment
- [ ] Demo video

---

## 📄 License

MIT License — see LICENSE file for details.

---

## 🔗 Links

- **Live App:** https://unify-os--wm464912.replit.app
- **Demo Video:** Coming soon
- **Firebase Project:** unifyos-980ea

---

<p align="center">
  <strong>When seconds matter, UnifyOS delivers.</strong><br>
  Built with ❤️ for Google Solution Challenge 2026
</p>
