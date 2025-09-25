import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import authRoutes from "./auth/routes";
import { setAdminData, initializeDefaultAdmin } from "./auth/adminAuth";
import { initializeWeb3 } from "./auth/walletAuth";
import { setAuthData } from "./auth/middleware";
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
  // Enhanced blockchain fields
  transactionHash?: string;
  blockchainStatus?: "none" | "pending" | "created" | "failed" | "mock" | "fallback";
  qrCodeData?: string;
};
let tourists: Tourist[] = [];
// Simple in-memory activity log for admin actions (dev only)
let adminLogs: { userId: string; action: string; admin?: string; notes?: string; timestamp: string }[] = [];

// Police data structure
type Police = {
  _id: string;
  name: string;
  email: string;
  passwordHash: string; // Required to match shared types
  badgeNumber: string;
  department: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
};

let police: Police[] = [];

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

  // Initialize authentication system
  initializeDefaultAdmin();
  initializeWeb3();
  
  // Sync in-memory data with auth system
  setAdminData([], tourists, []);
  setAuthData([], tourists, police);

  // Auth routes
  app.use('/api', authRoutes);

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Auth (mocked)
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, phone, password, itinerary, emergencyName, emergencyPhone, documentType, documentNumber, documentFileName } = req.body ?? {};
    
    // Enhanced validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "missing_required_fields", message: "Name, email, phone, and password are required" });
    }
    
    if (!documentType || !documentNumber || !documentFileName) {
      return res.status(400).json({ error: "missing_document_info", message: "Document type, number, and file are required" });
    }
    
    // Check for existing email
    const existingUser = tourists.find((t) => t.email === email);
    if (existingUser) {
      return res.status(409).json({ error: "email_exists", message: "Email already registered" });
    }
    
    const userId = `t${Date.now()}`;
    const applicationDate = new Date().toISOString();
    
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
      applicationDate,
      blockchainStatus: "none",
      history: [{
        action: "registration_submitted",
        admin: "system",
        notes: "Digital ID application submitted",
        timestamp: applicationDate
      }]
    };
    
    tourists.push(record);
    
    // Add to admin logs
    adminLogs.push({
      userId: userId,
      action: "registration_submitted",
      admin: "system",
      notes: `New registration: ${name} (${email})`,
      timestamp: applicationDate
    });
    
    res.json({ 
      success: true, 
      userId, 
      status: "pending_verification",
      message: "Registration submitted successfully. You will be notified once verification is complete.",
      applicationDate
    });
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

  // Tourist Profile API for authenticated users
  app.get("/api/tourist/profile/:userId", (req, res) => {
    const { userId } = req.params;
    const t = tourists.find((x) => String(x._id) === String(userId));
    if (!t) return res.status(404).json({ error: "not_found" });
    
    // Return profile data without password
    const { password, ...profileData } = t as any;
    res.json(profileData);
  });

  // Digital ID information endpoint
  app.get("/api/tourist/digital-id/:userId", async (req, res) => {
    const { userId } = req.params;
    const t = tourists.find((x) => String(x._id) === String(userId));
    if (!t) return res.status(404).json({ error: "not_found" });
    
    const digitalIdData: any = {
      userId: t._id,
      blockchainId: t.blockchainId,
      verificationStatus: t.verificationStatus,
      qrCodeData: (t as any).qrCodeData,
      blockchainStatus: (t as any).blockchainStatus || "none",
      transactionHash: (t as any).transactionHash,
      applicationDate: t.applicationDate
    };

    // If verified and has blockchain ID, try to get blockchain verification
    if (t.verificationStatus === "verified" && t.blockchainId) {
      try {
        const blockchainUrl = new URL(`${BLOCKCHAIN_API_URL}/verifyID`);
        blockchainUrl.searchParams.set("blockchainId", t.blockchainId);
        const r = await fetch(blockchainUrl);
        
        if (r.ok) {
          const blockchainData = await r.json();
          digitalIdData.blockchainVerification = {
            valid: blockchainData.valid,
            issuedAt: blockchainData.issuedAt,
            expiresAt: blockchainData.expiresAt,
            onChain: blockchainData.onChain
          };
        }
      } catch (e) {
        digitalIdData.blockchainVerification = {
          error: "blockchain_unreachable",
          fallback: true
        };
      }
    }
    
    res.json(digitalIdData);
  });

  // Update profile endpoint for authenticated users
  app.put("/api/tourist/profile/:userId", (req, res) => {
    const { userId } = req.params;
    const { name, phone, emergencyName, emergencyPhone, itinerary } = req.body || {};
    const t = tourists.find((x) => String(x._id) === String(userId));
    if (!t) return res.status(404).json({ error: "not_found" });
    
    // Only allow updating certain fields
    if (name) t.name = name;
    if (phone) t.phone = phone;
    if (emergencyName) t.emergencyName = emergencyName;
    if (emergencyPhone) t.emergencyPhone = emergencyPhone;
    if (itinerary) t.itinerary = itinerary;
    
    // Add update to history
    t.history = t.history || [];
    t.history.push({
      action: 'profile_updated',
      admin: 'user',
      notes: 'Profile information updated by user',
      timestamp: new Date().toISOString()
    });
    
    const { password, ...profileData } = t as any;
    res.json({ success: true, profile: profileData });
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
      // Enhanced blockchain integration with better error handling
      const blockchainPayload = {
        userId: t._id,
        name: t.name,
        documentType: t.documentType,
        documentNumber: t.documentNumber,
        kycHash: t.documentFileName ? `sha256:${t.documentFileName}` : undefined,
        validUntil: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString() // 1 year
      };
      
      const r = await fetch(`${BLOCKCHAIN_API_URL}/createID`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(blockchainPayload),
      });
      
      if (!r.ok) {
        throw new Error(`Blockchain service returned ${r.status}: ${r.statusText}`);
      }
      
      const json = await r.json();
      
      // Update tourist record with blockchain information
      t.blockchainId = json?.blockchainId ?? `bc_${userId}`;
      t.verificationStatus = "verified";
      
      // Add blockchain-specific fields if available
      if (json.transactionHash) {
        (t as any).transactionHash = json.transactionHash;
      }
      if (json.qr) {
        (t as any).qrCodeData = json.qr;
      }
      if (json.onChain !== undefined) {
        (t as any).blockchainStatus = json.onChain ? "created" : "mock";
      }
      
      // append history
      t.history = t.history ?? [];
      t.history.push({ 
        action: 'approved', 
        admin, 
        notes: notes ? `${notes} (Blockchain ID: ${t.blockchainId})` : `Blockchain ID created: ${t.blockchainId}`, 
        timestamp: new Date().toISOString() 
      });
      adminLogs.push({ 
        userId: userId, 
        action: 'approved', 
        admin, 
        notes: notes ? `${notes} (Blockchain ID: ${t.blockchainId})` : `Blockchain ID created: ${t.blockchainId}`, 
        timestamp: new Date().toISOString() 
      });
      
      return res.json({ 
        success: true, 
        blockchainId: t.blockchainId,
        transactionHash: json.transactionHash,
        onChain: json.onChain,
        qrCode: json.qr
      });
      
    } catch (e: any) {
      console.error(`Blockchain error for user ${userId}:`, e.message);
      
      // Fallback: approve without blockchain if service is unavailable
      if (e.message.includes('CONNECTION_REFUSED') || e.message.includes('ECONNREFUSED') || e.message.includes('fetch failed')) {
        console.log(`Fallback: Approving ${userId} without blockchain integration`);
        
        t.blockchainId = `fallback_${userId}_${Date.now()}`;
        t.verificationStatus = "verified";
        (t as any).blockchainStatus = "fallback";
        
        t.history = t.history ?? [];
        t.history.push({ 
          action: 'approved', 
          admin, 
          notes: notes ? `${notes} (Blockchain unavailable - fallback mode)` : 'Approved in fallback mode - blockchain unavailable', 
          timestamp: new Date().toISOString() 
        });
        adminLogs.push({ 
          userId: userId, 
          action: 'approved', 
          admin, 
          notes: notes ? `${notes} (Blockchain unavailable - fallback mode)` : 'Approved in fallback mode - blockchain unavailable', 
          timestamp: new Date().toISOString() 
        });
        
        return res.json({ 
          success: true, 
          blockchainId: t.blockchainId,
          fallback: true,
          warning: "Blockchain service unavailable - using fallback mode"
        });
      }
      
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

  // Simple in-memory settings (dev only)
  let userSettings: any = {};
  let adminSettingsStore: any = { maintenanceMode: false, blockchainMock: true };

  app.get('/api/user/settings', (req, res) => {
    res.json(userSettings);
  });

  app.put('/api/user/settings', (req, res) => {
    userSettings = { ...(userSettings || {}), ...(req.body || {}) };
    res.json({ success: true, settings: userSettings });
  });

  app.get('/api/admin/settings', (req, res) => {
    res.json(adminSettingsStore);
  });

  app.put('/api/admin/settings', (req, res) => {
    // Simple header-based admin check in dev
    const adminHeader = req.headers['x-admin'];
    if (!adminHeader) return res.status(401).json({ error: 'unauthorized' });
    adminSettingsStore = { ...(adminSettingsStore || {}), ...(req.body || {}) };
    res.json({ success: true, settings: adminSettingsStore });
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

  // Blockchain ID creation endpoint
  app.post("/api/blockchain/create-id", async (req, res) => {
    const { userId, name, documentHash } = req.body || {};
    
    if (!userId || !name) {
      return res.status(400).json({ error: "missing_required_fields" });
    }
    
    try {
      const tourist = tourists.find((t) => t._id === userId);
      if (!tourist) {
        return res.status(404).json({ error: "tourist_not_found" });
      }
      
      const blockchainPayload = {
        userId,
        name,
        documentType: tourist.documentType,
        documentNumber: tourist.documentNumber,
        kycHash: documentHash || `sha256:${tourist.documentFileName}`,
        validUntil: new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000).toISOString() // 5 years
      };
      
      const r = await fetch(`${BLOCKCHAIN_API_URL}/createID`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(blockchainPayload),
      });
      
      const json = await r.json();
      
      if (!r.ok) {
        throw new Error(`Blockchain service error: ${r.status}`);
      }
      
      // Update tourist record
      tourist.blockchainId = json.blockchainId;
      tourist.transactionHash = json.transactionHash;
      tourist.blockchainStatus = json.onChain ? "created" : "mock";
      (tourist as any).qrCodeData = json.qr;
      
      res.json({
        success: true,
        blockchainId: json.blockchainId,
        qrCode: json.qr,
        expiresAt: json.expiresAt,
        transactionHash: json.transactionHash,
        onChain: json.onChain
      });
      
    } catch (e: any) {
      console.error(`Blockchain ID creation error:`, e.message);
      res.status(502).json({ 
        error: "blockchain_service_error", 
        message: e.message,
        fallback: true
      });
    }
  });

  // Blockchain ID verification endpoint
  app.get("/api/blockchain/verify-id", async (req, res) => {
    const blockchainId = req.query.blockchainId as string;
    
    if (!blockchainId) {
      return res.status(400).json({ error: "missing_blockchain_id" });
    }
    
    try {
      const url = new URL(`${BLOCKCHAIN_API_URL}/verifyID`);
      url.searchParams.set("blockchainId", blockchainId);
      
      const r = await fetch(url);
      const json = await r.json();
      
      res.status(r.status).json(json);
    } catch (e: any) {
      res.status(502).json({ 
        error: "blockchain_verification_error", 
        message: e.message 
      });
    }
  });

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

  // Blockchain health check endpoint
  app.get("/api/bridge/blockchain/health", async (req, res) => {
    try {
      const r = await fetch(`${BLOCKCHAIN_API_URL}/health`);
      const json = await r.json();
      res.status(r.status).json(json);
    } catch (e: any) {
      res.status(502).json({ 
        error: "blockchain_unreachable", 
        details: e?.message,
        fallbackMode: true,
        blockchainUrl: BLOCKCHAIN_API_URL
      });
    }
  });

  // Enhanced verification endpoint that includes blockchain status
  app.get("/api/tourists/:id/verification", async (req, res) => {
    const t = tourists.find((x) => String(x._id) === String(req.params.id));
    if (!t) return res.status(404).json({ error: "not_found" });

    const response: any = {
      userId: t._id,
      name: t.name,
      email: t.email,
      verificationStatus: t.verificationStatus,
      blockchainId: t.blockchainId,
      applicationDate: t.applicationDate,
      history: t.history
    };

    // If verified and has blockchain ID, try to get blockchain verification
    if (t.verificationStatus === "verified" && t.blockchainId) {
      try {
        const blockchainUrl = new URL(`${BLOCKCHAIN_API_URL}/verifyID`);
        blockchainUrl.searchParams.set("blockchainId", t.blockchainId);
        const r = await fetch(blockchainUrl);
        
        if (r.ok) {
          const blockchainData = await r.json();
          response.blockchainVerification = {
            valid: blockchainData.valid,
            status: blockchainData.status,
            issuedAt: blockchainData.issuedAt,
            expiresAt: blockchainData.expiresAt,
            onChain: blockchainData.onChain,
            verificationLevel: blockchainData.verificationLevel
          };
        }
      } catch (e) {
        response.blockchainVerification = {
          error: "blockchain_unreachable",
          fallback: true
        };
      }
    }

    res.json(response);
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

export default createServer;