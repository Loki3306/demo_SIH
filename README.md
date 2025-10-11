# Smart Tourist Safety — Development Scaffold

Futuristic, responsive full‑stack scaffold for real‑time tourist safety monitoring and incident response. Development‑only: mock AI/ML and Blockchain services are included and are hot‑swappable via env vars.

## Tech Stack
- Frontend: React + Vite + TailwindCSS + Framer Motion + Three.js (React Three Fiber), i18next (EN/HI)
- Backend: Express (integrated with Vite dev server), Socket.IO for realtime
- Maps: OpenStreetMap via react‑leaflet (+ heatmap planned)
- Mocks: `/blockchain` and `/aiml` standalone Express servers
- Icons: lucide-react

## Disclaimer
Development phase only. No production configs. Do not upload real KYC data.

## Prerequisites
- Node.js 18+

## Quick Start
1. Install deps: pnpm install
2. Start dev UI + API: pnpm dev
3. Open the landing page at /
4. (Optional) Start mocks:
   - Blockchain: pnpm dev:blockchain (http://localhost:5002)
   - AI/ML: pnpm dev:aiml (http://localhost:5003)

## Environment (dev)
Create .env in project root:
```
PORT=8080
BLOCKCHAIN_API_URL=http://localhost:5002
AIML_API_URL=http://localhost:5003
VITE_AIML_API_URL=http://127.0.0.1:8000
EXPRESS_WEBHOOK_URL=http://localhost:5001/api/v1/alerts/anomaly
HEALTH_CHECK_ENABLED=true
FALLBACK_MODE_ENABLED=true
PING_MESSAGE=ping
```

## Admin Authentication

The system supports two authentication methods for admins:

1. **Password-based authentication**:
   - Default admin credentials:
     - Email: admin@yatrarakshak.com
     - Password: admin123

2. **Wallet-based authentication**:
   - Uses Ethereum private keys for authentication
   - Requires Ganache GUI to be running
   - Admin must have authority on the smart contract

To access the admin dashboard:
1. Navigate to `/admin/login`
2. Choose authentication method
3. Enter credentials
4. Access protected admin routes at `/admin` and `/admin/logs`

## Seed Data
Sample JSON files are in `seed_data/` (tourists, police, alerts). The API loads `seed_data/tourists.json` for basic responses.

## Real-Time AI Anomaly Detection Flow

### Full-Stack Integration
The system now features end-to-end AI-powered location anomaly detection:

1. **Tourist starts journey** on Tourist Dashboard → sends authenticated request to Django AI service
2. **Location tracking** every 10 seconds → Django processes with ML models for anomaly detection  
3. **Anomaly alerts** → Django webhook calls Express server → Socket.IO broadcasts to Admin Dashboard

### Setup Steps
1. **Install Django AI service dependencies:**
   ```bash
   cd aiml
   pip install -r requirements.txt
   python manage.py migrate
   ```

2. **Start all services:**
   ```bash
   # Terminal 1: Main app (React + Express)
   pnpm dev
   
   # Terminal 2: Django AI service
   cd aiml && python manage.py runserver 8000
   
   # Terminal 3: Optional blockchain service
   pnpm dev:blockchain
   ```

### Authentication & Security
- **Authentication**: Currently disabled for development/testing (can be re-enabled in Django views)
- **CORS Configuration**: Django allows requests from React dev server (localhost:5173)
- **User Creation**: Users are automatically created when anomalies are detected

### Testing the Flow
1. **Tourist Journey:**
   - Navigate to `/tourist/dashboard`
   - Click "Start Journey" (requires verified Digital ID status)
   - Location tracking begins automatically
   - Click "End Journey" to stop

2. **Admin Monitoring:**
   - Open `/admin` in another tab
   - Watch real-time anomaly alerts appear when ML detects unusual patterns
   - Notifications and dashboard cards update automatically

### Socket.IO Events
```javascript
// Panic alert (existing)
socket.on('panic_alert', {alertId, userId, name, location, severity, timestamp});

// New anomaly alert
socket.on('new-anomaly-alert', {
  alertId, userId, name, location, severity, 
  anomalyScore, alertType, timestamp
});
```

## Test Panic Flow
- Open Tourist Dashboard: /tourist/dashboard
- Click Panic — server stores alert and emits `panic_alert` via Socket.IO
- Open Police Dashboard: /police/dashboard to see live alerts

## Landing Page
- Professional hero with vector collage of Indian heritage monuments (parallax)
- Interactive 2D India map of hotspots with hover metrics
- Feature strip with animated travel icons (AI, Blockchain, Geo‑fence, SOS)
- AI Travel Guide and Smart Itinerary sections
- Storytelling timeline of the tourist journey

## Bridge Proxies (Plug‑and‑Play)
- Backend forwards to:
  - /api/bridge/blockchain/* -> BLOCKCHAIN_API_URL (default http://localhost:5002)
  - /api/bridge/aiml/* -> AIML_API_URL (default http://localhost:5003)
- Swap to real providers by changing env vars — request/response shapes match the mocks (see `blockchain/README.md`, `aiml/README.md`).

## Routes (dev)
- POST /api/auth/register, /api/auth/login (mocked)
- GET /api/tourists, /api/tourists/:id
- GET /api/alerts
- POST /api/alerts/panic
- POST /api/bridge/blockchain/createID
- GET  /api/bridge/blockchain/verifyID
- POST /api/bridge/aiml/safetyScore
- POST /api/bridge/aiml/detectAnomaly

## Admin Routes
- GET /admin/login - Admin login page
- GET /admin - Admin dashboard (protected)
- GET /admin/logs - Admin activity logs (protected)
- POST /api/auth/admin-login - Admin authentication endpoint

## Phase 1 Acceptance Checklist
- [x] Landing page with interactive 3D globe
- [x] Panic flow emits realtime alert
- [x] Police dashboard shows live feed
- [x] `/blockchain` and `/aiml` mocks present with READMEs
- [x] Plug‑and‑play bridge via env vars
- [x] EN/HI language toggle, dark mode
- [x] Admin authentication with route protection

## Roadmap
- Tourist auth + registration form, verification queue (admin)
- Leaflet heatmap overlay and geofences
- AI safety score update loop
- Postgres (auth) and MongoDB (app data) adapters

## Security Notes
- Dev only — never store plain KYC; hash sensitive identifiers
- Use HTTPS and proper auth in production

## Contributing
PRs welcome. Keep modules small, accessible, and well‑typed.