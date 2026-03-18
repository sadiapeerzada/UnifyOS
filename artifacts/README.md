# UnifyOS — Real-Time Crisis Coordination Platform

[![Google Solution Challenge 2026](https://img.shields.io/badge/Google%20Solution%20Challenge-2026-4285F4?style=flat-square&logo=google)](https://developers.google.com/community/gdsc-solution-challenge)
[![SDG 3](https://img.shields.io/badge/SDG%203-Good%20Health-4CAF50?style=flat-square)](https://sdgs.un.org/goals/goal3)
[![SDG 10](https://img.shields.io/badge/SDG%2010-Reduced%20Inequalities-DD1367?style=flat-square)](https://sdgs.un.org/goals/goal10)
[![SDG 11](https://img.shields.io/badge/SDG%2011-Sustainable%20Cities-FD9D24?style=flat-square)](https://sdgs.un.org/goals/goal11)
[![SDG 17](https://img.shields.io/badge/SDG%2017-Partnerships-19486A?style=flat-square)](https://sdgs.un.org/goals/goal17)

[![React Native](https://img.shields.io/badge/React%20Native-Expo-61DAFB?style=flat-square&logo=react)](https://expo.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Gemini AI](https://img.shields.io/badge/Gemini%20AI-Google-4285F4?style=flat-square&logo=google)](https://ai.google.dev)
[![IoT](https://img.shields.io/badge/IoT-ESP32-E7352C?style=flat-square)](https://www.espressif.com)

---

## The Problem

**3,500 deaths per year** from delayed emergency coordination in India's hospitality and public venue sector.

- 50,000+ hotels in India rely on siloed, analog emergency systems
- Average response delay: **3–5 minutes** — a gap that costs lives
- A 30-second improvement saves **40% more lives** *(NFPA, 2023)*

Current systems fail because they are fragmented:

| Gap | Reality |
|-----|---------|
| Fire alarms ring | But don't say *where* or *how severe* |
| Staff don't know who needs help | No unified command view |
| Responders arrive without context | No AI triage or incident summary |
| No audit trail | Manual logs miss critical details |

---

## The Solution

UnifyOS unifies guests, staff, and emergency responders in a **single real-time command centre**.

> One $35 IoT device. One app. Complete situational awareness.

```
Sensor detects threat
→ ESP32 sends data in < 1 second
→ Statistical anomaly detection scores confidence
→ Gemini AI generates plain-language incident summary
→ Staff guided through 6-step evacuation protocol
→ Multilingual alert broadcast (9 languages)
→ PDF incident report auto-generated
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| 🚨 Smart Panic Button | ESP32 + 4 sensors in a 3D-printed enclosure — ₹3,200/device |
| 🤖 AI Triage | Gemini AI prioritises concurrent alerts with confidence scoring |
| 🌍 Multilingual | 9 languages: EN HI AR FR ES ZH JA DE RU |
| 📄 PDF Reports | Auto-generated after every resolved incident |
| 🔊 Voice Alerts | Hands-free audio announcements for CRITICAL events |
| 📊 Anomaly Detection | Dynamic baseline + rate-of-change confidence engine |
| ✅ Evacuation Protocol | 6-step guided checklist for structured staff response |
| 🔌 Offline Resilience | Local storage + automatic retry on reconnect |

---

## Hardware — Smart Panic Button

**Components:** ESP32 DevKit V1 · MQ-2 Smoke Sensor · DHT22 Temp/Humidity · HC-SR501 PIR · Red Panic Button
**Enclosure:** 3D-printed PLA · **Cost:** ₹3,200 per unit · **10× cheaper** than traditional fire systems

### ESP32 Payload (every 1 second)

```json
{
  "device_id": "UnifyOS-001",
  "temp": 28.5,
  "smoke": 145,
  "motion": 1,
  "alert_type": "normal",
  "button": 0,
  "battery": 87
}
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native + Expo Router |
| Backend API | Node.js + Express + TypeScript |
| Database | PostgreSQL (Drizzle ORM) + Firebase Firestore |
| Realtime | WebSocket (ws) |
| Authentication | Firebase Auth (Google + Guest) |
| AI | Google Gemini API |
| Notifications | Firebase Cloud Messaging |
| Hardware | ESP32 + Arduino IDE |

---

## API Endpoints

```
POST /api/sensor-data              Receive ESP32 hardware readings
GET  /api/status                   System health check
GET  /api/devices/status           All device statuses
POST /api/devices/register         Register or update a device
POST /api/anomaly/stats            Anomaly detection statistics
POST /api/incidents/resolve        Resolve incident + generate PDF report
GET  /api/alerts                   Fetch alert history (paginated)
```

---

## Getting Started

**Prerequisites:** Node.js 18+ · pnpm · Expo Go (iOS/Android)

```bash
git clone https://github.com/sadiapeerzada/UnifyOS
cd UnifyOS
pnpm install
```

Create `.env` at the repo root:

```env
GEMINI_API_KEY=your_gemini_key
DATABASE_URL=your_postgres_url
EXPO_PUBLIC_BACKEND_URL=your_backend_url
```

```bash
pnpm dev          # Start all services (mobile + API)
```

Open Expo Go on your device and scan the QR code.

---

## Hardware Setup

1. Install [Arduino IDE](https://arduino.cc) and add ESP32 board support
2. Wire components per the Phase 1 schematic (see `/hardware/wiring.md`)
3. Update WiFi credentials + `BACKEND_URL` in `hardware/sketch.ino`
4. Upload sketch to ESP32 via USB
5. Open the UnifyOS app — the device appears as **ONLINE** in Devices tab

---

## App Flow

```
Launch
  └─ Custom splash screen (2 seconds)
       └─ Auth check
            ├─ Returning user ──────────────── Dashboard
            └─ New user
                 └─ Sign In (Google / Guest)
                      └─ Device Introduction (once)
                           └─ Device Setup (once)
                                └─ Dashboard
```

---

## SDG Alignment

| Goal | Impact |
|------|--------|
| **SDG 3** — Good Health | Faster emergency response directly reduces fatalities |
| **SDG 10** — Reduced Inequalities | Multilingual + accessible for diverse staff and guests |
| **SDG 11** — Sustainable Cities | Affordable smart infrastructure for public venues |
| **SDG 17** — Partnerships | Integrates with national emergency lines (112/101/102) |

---

## Team BlackBit

**Alisha Hasan · Asna Mirza · Sadia Peerzada · Sadia Zafreen**
Google Developer Student Clubs · Google Solution Challenge 2026

---

## Live Demo

- **App:** https://unify-os--wm464912.replit.app
- **GitHub:** https://github.com/sadiapeerzada/UnifyOS

---

> *When seconds matter, UnifyOS delivers.*
