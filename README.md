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
PORT=8080
BLOCKCHAIN_API_URL=http://localhost:5002
AIML_API_URL=http://localhost:5003

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

## Test Panic Flow
- Open Tourist Dashboard: /tourist/dashboard
- Click Panic — server stores alert and emits `panic_alert` via Socket.IO
- Open Police Dashboard: /police/dashboard to see live alerts

Socket.IO event: `panic_alert` payload
{
  "alertId": "a_...",
  "userId": "t123",
  "name": "Alice Kumar",
  "location": { "lat": 26.8467, "lng": 80.9462 },
  "severity": "high",
  "timestamp": "..."
}

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