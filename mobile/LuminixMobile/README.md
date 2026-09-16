# Luminix Mobile Health Bridge

> **Unified React Native Mobile Bridge for Apple HealthKit, Google Health Connect, and Direct BLE Devices.**

Architectural Reference: **Luminix Final Health Device Integration Architecture (Blueprint Sections 1 - 14)**

---

## 1. Architecture Overview

```
SMARTWATCH / HEALTH DEVICE
          ↓
      SMARTPHONE
          ↓
 ┌───────────────────────┐
 │ iPhone → HealthKit    │
 │ Android → Health      │
 │           Connect     │
 └───────────┬───────────┘
             ↓
   LUMINIX MOBILE APP
   "HEALTH DATA BRIDGE"
             ↓
       LUMINIX API (/api/v1/health/...)
             ↓
      LUMINIX DATABASE
             ↓
       LUMINIX AI
             ↓
      LUMINIX WEB APP
```

## 2. Directory Structure & 12 Modular Components

```
mobile/LuminixMobile/
├── App.js                     # Main Bridge UI Dashboard
├── index.js                   # React Native app registration
├── package.json               # Dependencies & scripts
└── src/
    ├── Authentication/        # API keys, tokens & endpoint config
    ├── HealthPermissions/     # Cross-platform permission orchestrator
    ├── HealthKitAdapter/      # iOS Apple HealthKit bindings
    ├── HealthConnectAdapter/  # Android Health Connect bindings
    ├── HealthDataReader/      # Abstracted unified vital signs reader
    ├── HealthDataNormalizer/  # Vendor schema to Luminix standard format
    ├── HealthDataValidator/   # Physiological range & clinical sanity filter
    ├── LocalHealthDatabase/   # Offline queuing, caching & watermarks
    ├── SyncManager/           # Incremental batch sync to Luminix API
    ├── LiveMonitoringManager/ # High-frequency streaming controller
    ├── WebSocketManager/      # Resilient WebSocket connection to /live/ws
    └── DeviceManager/         # Direct BLE pairing (Omron Blood Pressure)
```

## 3. Supported Metrics
- Heart Rate (BPM) & Resting Heart Rate
- Heart Rate Variability (SDNN / RMSSD)
- Step Count, Distance, Active Calories
- Blood Oxygen Saturation (SpO₂)
- Body Temperature (°C)
- Respiratory Rate (breaths/min)
- Sleep Stages & Duration
- Blood Pressure (Systolic / Diastolic mmHg) via genuine cuff / device

## 4. Setup & Running

```bash
cd mobile/LuminixMobile
npm install

# Run on iOS Simulator / Device
npm run ios

# Run on Android Emulator / Device
npm run android
```

## 5. Clinical Safety & Data Truthfulness
- **Strict Blood Pressure Rule**: BP is never estimated or simulated. Only genuine cuff-measured readings are displayed with origin source and precise timestamp age.
- **Multi-Signal Heart Risk Engine**: Cardiac strain score, resting HR delta vs baseline, HRV autonomic tone, blood pressure classification, myocardial SpO₂ oxygenation with explicit clinical decision-support disclaimer.
