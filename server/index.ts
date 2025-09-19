import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import path from "path";
import fs from "fs";

// Simple in-memory stores for dev phase
type Alert = {
  alertId: string;
  userId: string;
  type: string;
  location: { lat: number; lng: number };
  severity: string;
  status: string;
  timestamp: string;
  acknowledgedBy?: string;
};

let alerts: Alert[] = [];
type Tourist = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  itinerary?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  documentType?: "aadhaar" | "passport";
  documentNumber?: string;
  documentFileName?: string;
  verificationStatus: "pending" | "verified" | "rejected" | "archived";
  // audit history for admin actions
  history?: { action: string; admin?: string; notes?: string; timestamp: string }[];
  blockchainId?: string;
  applicationDate?: string;
};
let tourists: Tourist[] = [];
// Simple in-memory activity log for admin actions (dev only)
let adminLogs: { userId: string; action: string; admin?: string; notes?: string; timestamp: string }[] = [];

function loadSeedData() {
  try {
    const seedPath = path.join(process.cwd(), "seed_data", "tourists.json");
    if (fs.existsSync(seedPath)) {
      const raw = fs.readFileSync(seedPath, "utf-8");
      tourists = JSON.parse(raw);
      // Populate adminLogs from any history present in seed data
      adminLogs = [];
      for (const t of tourists) {
        if (Array.isArray(t.history)) {
          for (const h of t.history) {
            adminLogs.push({
              userId: t._id,
              action: h.action ?? "unknown",
              admin: h.admin,
              notes: h.notes,
              timestamp: h.timestamp ?? new Date().toISOString(),
            });
          }
        }
      }
      // If no logs were present in seed data, add a small sample entry for dev UX
      if (adminLogs.length === 0 && tourists.length > 0) {
        adminLogs.push({ userId: tourists[0]._id, action: 'seeded', admin: 'system', notes: 'Seeded admin log entry', timestamp: new Date().toISOString() });
      }
    }
  } catch (e) {
    // ignore seed load errors in dev
  }
}

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  loadSeedData();

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Auth (mocked)
  app.post("/api/auth/register", (req, res) => {
    const { name, email, phone, password, itinerary, emergencyName, emergencyPhone, documentType, documentNumber, documentFileName } = req.body ?? {};
    if (!name || !email) return res.status(400).json({ error: "invalid_input" });
    const userId = `t${Date.now()}`;
    const record: Tourist = {
      _id: userId,
      name,
      email,
      phone,
      itinerary,
      emergencyName,
      emergencyPhone,
      documentType,
      documentNumber,
      documentFileName,
      verificationStatus: "pending",
      applicationDate: new Date().toISOString(),
    };
    tourists.push(record);
    res.json({ success: true, userId, status: "pending_verification" });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email } = req.body ?? {};
    const user = tourists.find((t) => t.email === email) ?? tourists[0];
    res.json({ token: "dev_token", refreshToken: "dev_refresh", role: "tourist", userId: user?._id ?? "t000" });
  });

  // Tourists
  app.get("/api/tourists", (_req, res) => {
    res.json({ data: tourists, total: tourists.length });
  });

  app.get("/api/tourists/:id", (req, res) => {
    const t = tourists.find((x) => String(x._id) === String(req.params.id));
    if (!t) return res.status(404).json({ error: "not_found" });
    res.json({ ...t });
  });

  // Alerts
  app.get("/api/alerts", (_req, res) => {
    res.json({ data: alerts.slice(-100).reverse() });
  });

  app.post("/api/alerts/panic", (req, res) => {
    const { userId, location, timestamp, notes } = req.body ?? {};
    const id = `a_${Date.now()}`;
    const t = tourists.find((x) => String(x._id) === String(userId));
    const payload: Alert = {
      alertId: id,
      userId: userId ?? "t000",
      type: "panic",
      location: location ?? { lat: 28.6139, lng: 77.209 },
      severity: "high",
      status: "active",
      timestamp: timestamp ?? new Date().toISOString(),
    };
    alerts.push(payload);

    const io = (req.app as any).get("io");
    if (io) {
      io.emit("panic_alert", {
        alertId: payload.alertId,
        userId: payload.userId,
        name: t?.name ?? "Unknown",
        location: payload.location,
        severity: payload.severity,
        timestamp: payload.timestamp,
        notes,
      });
    }

    res.json({ success: true, alertId: id });
  });

  // Admin verification APIs
  app.get("/api/admin/pending-verifications", (_req, res) => {
    // support optional status filter via query param ?status=pending|verified|rejected|archived|all
    // and optional search query ?q= to match name or email (case-insensitive)
    const status = String(_req.query.status ?? "pending").toLowerCase();
    const q = String(_req.query.q ?? "").trim().toLowerCase();
    let result: Tourist[];
    if (status === "all") {
      result = tourists.slice();
    } else {
      result = tourists.filter((t) => t.verificationStatus === status);
    }
    if (q) {
      result = result.filter((t) => {
        const name = (t.name ?? "").toLowerCase();
        const email = (t.email ?? "").toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }

    // pagination
    const page = Math.max(1, parseInt(String(_req.query.page ?? "1"), 10) || 1);
    const perPage = Math.max(1, Math.min(100, parseInt(String(_req.query.perPage ?? "10"), 10) || 10));
    const total = result.length;
    const start = (page - 1) * perPage;
    const paged = result.slice(start, start + perPage);
    res.json({ data: paged, total });
  });

  app.post("/api/admin/approve/:userId", async (req, res) => {
    const { userId } = req.params;
    const notes = (req.body && (req.body.notes as string)) ?? undefined;
    const admin = (req.headers['x-admin'] as string) ?? 'admin-dev';
    const t = tourists.find((x) => x._id === userId);
    if (!t) return res.status(404).json({ error: "not_found" });
    try {
      const r = await fetch(`${BLOCKCHAIN_API_URL}/createID`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: t.name, documentType: t.documentType, documentNumber: t.documentNumber }),
      });
      const json = await r.json();
      t.blockchainId = json?.blockchainId ?? `bc_${userId}`;
      t.verificationStatus = "verified";
      // append history
  t.history = t.history ?? [];
  t.history.push({ action: 'approved', admin, notes, timestamp: new Date().toISOString() });
  adminLogs.push({ userId: userId, action: 'approved', admin, notes, timestamp: new Date().toISOString() });
      return res.json({ success: true, blockchainId: t.blockchainId });
    } catch (e: any) {
      return res.status(502).json({ error: "blockchain_error", details: e?.message });
    }
  });

  app.post("/api/admin/reject/:userId", (req, res) => {
    const { userId } = req.params;
    const notes = (req.body && (req.body.notes as string)) ?? undefined;
    const admin = (req.headers['x-admin'] as string) ?? 'admin-dev';
    const t = tourists.find((x) => x._id === userId);
    if (!t) return res.status(404).json({ error: "not_found" });
    t.verificationStatus = "rejected";
    t.history = t.history ?? [];
    t.history.push({ action: 'rejected', admin, notes, timestamp: new Date().toISOString() });
    adminLogs.push({ userId: userId, action: 'rejected', admin, notes, timestamp: new Date().toISOString() });
    res.json({ success: true });
  });

  // Archive an application (mark as archived)
  app.post("/api/admin/archive/:userId", (req, res) => {
    const { userId } = req.params;
    const admin = (req.headers['x-admin'] as string) ?? 'admin-dev';
    const notes = (req.body && (req.body.notes as string)) ?? undefined;
    const t = tourists.find((x) => x._id === userId);
    if (!t) return res.status(404).json({ error: "not_found" });
    t.verificationStatus = 'archived';
    t.history = t.history ?? [];
    t.history.push({ action: 'archived', admin, notes, timestamp: new Date().toISOString() });
    adminLogs.push({ userId: userId, action: 'archived', admin, notes, timestamp: new Date().toISOString() });
    res.json({ success: true });
  });

  // Admin activity logs
  app.get('/api/admin/logs', (_req, res) => {
    res.json({ data: adminLogs.slice().reverse() });
  });

  // Admin-only document retrieval (simple header-based check for demo)
  app.get("/api/admin/document/:userId", (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    // In production use proper auth; here we allow if header present or in dev env
    if (!adminKey && process.env.NODE_ENV === 'production') return res.status(401).json({ error: 'unauthorized' });
    const { userId } = req.params;
    const t = tourists.find((x) => x._id === userId);
    if (!t) return res.status(404).json({ error: 'not_found' });
    if (!t.documentFileName) return res.status(404).json({ error: 'no_document' });
    // Try seed_data folder or public uploads folder
    const possiblePaths = [
      path.join(process.cwd(), 'seed_data', t.documentFileName),
      path.join(process.cwd(), 'public', 'uploads', t.documentFileName),
    ];
    const found = possiblePaths.find((p) => fs.existsSync(p));
    if (!found) return res.status(404).json({ error: 'document_not_found' });
    res.sendFile(found);
  });

  // Bridge proxies
  const BLOCKCHAIN_API_URL = process.env.BLOCKCHAIN_API_URL || "http://localhost:5002";
  const AIML_API_URL = process.env.AIML_API_URL || "http://localhost:5003";

  app.post("/api/bridge/blockchain/createID", async (req, res) => {
    try {
      const r = await fetch(`${BLOCKCHAIN_API_URL}/createID`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req.body ?? {}),
      });
      const json = await r.json();
      res.status(r.status).json(json);
    } catch (e: any) {
      res.status(502).json({ error: "upstream_unreachable", details: e?.message });
    }
  });

  app.get("/api/bridge/blockchain/verifyID", async (req, res) => {
    try {
      const url = new URL(`${BLOCKCHAIN_API_URL}/verifyID`);
      if (req.query.blockchainId) url.searchParams.set("blockchainId", String(req.query.blockchainId));
      const r = await fetch(url);
      const json = await r.json();
      res.status(r.status).json(json);
    } catch (e: any) {
      res.status(502).json({ error: "upstream_unreachable", details: e?.message });
    }
  });

  app.post("/api/bridge/aiml/safetyScore", async (req, res) => {
    try {
      const r = await fetch(`${AIML_API_URL}/safetyScore`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req.body ?? {}),
      });
      const json = await r.json();
      res.status(r.status).json(json);
    } catch (e: any) {
      res.status(502).json({ error: "upstream_unreachable", details: e?.message });
    }
  });

  app.post("/api/bridge/aiml/detectAnomaly", async (req, res) => {
    try {
      const r = await fetch(`${AIML_API_URL}/detectAnomaly`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req.body ?? {}),
      });
      const json = await r.json();
      res.status(r.status).json(json);
    } catch (e: any) {
      res.status(502).json({ error: "upstream_unreachable", details: e?.message });
    }
  });

  return app;
}
