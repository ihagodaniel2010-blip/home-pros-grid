import "dotenv/config";
import express from "express";
import session from "express-session";
import fs from "fs/promises";
import path from "path";
import { readSiteSettings, writeSiteSettings } from "./site-settings.store.js";

const app = express();
const PORT = Number(process.env.PORT || 8787);

const normalizeEnv = (value, fallback = "") => {
  const text = String(value ?? fallback).trim();
  return text.replace(/^['"]+|['"]+$/g, "");
};

const ADMIN_EMAIL = normalizeEnv(process.env.ADMIN_EMAIL, "admin@homepros.com").toLowerCase();
const SESSION_SECRET = normalizeEnv(process.env.SESSION_SECRET);
const NODE_ENV = normalizeEnv(process.env.NODE_ENV, "development");
const FRONTEND_ORIGIN = normalizeEnv(process.env.FRONTEND_ORIGIN, "http://localhost:8080");
const SESSION_COOKIE_SAME_SITE = normalizeEnv(
  process.env.SESSION_COOKIE_SAME_SITE,
  NODE_ENV === "production" ? "none" : "lax"
);
const SESSION_COOKIE_SECURE =
  typeof process.env.SESSION_COOKIE_SECURE === "string"
    ? normalizeEnv(process.env.SESSION_COOKIE_SECURE).toLowerCase() === "true"
    : NODE_ENV === "production";
const isVercelRuntime = process.env.VERCEL === "1";
const dataDir = isVercelRuntime ? path.resolve("/tmp", "home-pros-grid-data") : path.resolve(process.cwd(), "data");

if (!SESSION_SECRET) {
  console.error("Missing SESSION_SECRET in environment.");
  process.exit(1);
}

app.set("trust proxy", 1);
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});
app.use(express.json({ limit: "1mb" }));
app.use(
  session({
    name: "networx_admin",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: SESSION_COOKIE_SAME_SITE,
      secure: SESSION_COOKIE_SECURE,
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

const dataPath = path.resolve(dataDir, "portfolio.json");
const loginAttemptsPath = path.resolve(dataDir, "login-attempts.json");

const defaultPortfolio = {
  version: 1,
  updatedAt: new Date().toISOString(),
  categories: [
    "Kitchens",
    "Bathrooms",
    "Bedrooms",
    "Flooring",
    "Painting",
    "Roofing",
    "Remodeling",
    "Decks",
    "Outdoor",
  ],
  items: [],
};

const toText = (value) => String(value ?? "").trim();
const toList = (value) =>
  Array.isArray(value) ? value.map((item) => toText(item)).filter(Boolean) : [];

const sanitizeItem = (value) => {
  if (!value) return null;
  const title = toText(value.title);
  const fallbackId = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const images = toList(value.images);
  const coverImage = toText(value.coverImage) || images[0] || "";

  return {
    id: toText(value.id) || fallbackId || `project-${Date.now()}`,
    title,
    category: toText(value.category),
    coverImage,
    images,
    tags: toList(value.tags),
    description: toText(value.description),
    highlights: toList(value.highlights),
    materials: toList(value.materials),
    timeline: toList(value.timeline),
    scope: toText(value.scope),
    featured: Boolean(value.featured),
    beforeAfter: value.beforeAfter
      ? {
          before: toText(value.beforeAfter.before),
          after: toText(value.beforeAfter.after),
        }
      : undefined,
  };
};

const sanitizePortfolio = (payload) => {
  const categories = toList(payload?.categories);
  const items = Array.isArray(payload?.items)
    ? payload.items.map(sanitizeItem).filter(Boolean)
    : [];

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    categories,
    items,
  };
};

const readPortfolio = async () => {
  try {
    const raw = await fs.readFile(dataPath, "utf8");
    const parsed = JSON.parse(raw);
    return sanitizePortfolio(parsed);
  } catch (error) {
    if (error.code === "ENOENT") {
      await writePortfolio(defaultPortfolio);
      return defaultPortfolio;
    }
    throw error;
  }
};

const writePortfolio = async (payload) => {
  const next = sanitizePortfolio(payload);
  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  const tempPath = `${dataPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(tempPath, dataPath);
  return next;
};

const readLoginAttempts = async () => {
  try {
    const raw = await fs.readFile(loginAttemptsPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

const writeLoginAttempts = async (attempts) => {
  await fs.mkdir(path.dirname(loginAttemptsPath), { recursive: true });
  const tempPath = `${loginAttemptsPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(attempts, null, 2), "utf8");
  await fs.rename(tempPath, loginAttemptsPath);
};

const recordLoginAttempt = async ({ email, ip, userAgent, outcome, reason }) => {
  const entry = {
    timestamp: new Date().toISOString(),
    email,
    ip,
    userAgent,
    outcome,
    reason,
  };
  const attempts = await readLoginAttempts();
  attempts.unshift(entry);
  const trimmed = attempts.slice(0, 200);
  await writeLoginAttempts(trimmed);
  console.log(`LOGIN_ATTEMPT email=${email} outcome=${outcome} reason=${reason}`);
};

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map();

const isRateLimited = (ip) => {
  const now = Date.now();
  const history = rateLimitMap.get(ip) || [];
  const recent = history.filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
};

const requireAdmin = (req, res, next) => {
  if (!req.session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
};

app.post("/api/auth/login", async (req, res) => {
  const { email } = req.body || {};
  const ip = req.ip || "unknown";
  const userAgent = req.get("user-agent") || "";

  if (isRateLimited(ip)) {
    await recordLoginAttempt({
      email: String(email || ""),
      ip,
      userAgent,
      outcome: "fail",
      reason: "rate_limited",
    });
    return res.status(429).json({ error: "Muitas tentativas" });
  }

  req.session.user = { email: ADMIN_EMAIL };
  await recordLoginAttempt({
    email: String(email || ADMIN_EMAIL),
    ip,
    userAgent,
    outcome: "success",
    reason: "success",
  });
  if (req.accepts("html")) {
    return res.redirect("/admin");
  }
  return res.json({ ok: true, email: ADMIN_EMAIL, redirect: "/admin" });
});

app.get("/api/auth/login", async (req, res) => {
  const ip = req.ip || "unknown";
  const userAgent = req.get("user-agent") || "";

  req.session.user = { email: ADMIN_EMAIL };
  await recordLoginAttempt({
    email: ADMIN_EMAIL,
    ip,
    userAgent,
    outcome: "success",
    reason: "success",
  });

  return res.redirect("/admin");
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("networx_admin");
    if (req.accepts("html")) {
      return res.redirect("/");
    }
    return res.json({ ok: true, redirect: "/" });
  });
});

app.get("/api/auth/me", (req, res) => {
  if (!req.session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return res.json({ email: req.session.user.email });
});

app.get("/api/portfolio", async (_req, res) => {
  const portfolio = await readPortfolio();
  res.json({
    categories: portfolio.categories,
    items: portfolio.items,
    updatedAt: portfolio.updatedAt,
  });
});

app.get("/api/site-settings", async (_req, res) => {
  const settings = await readSiteSettings();
  res.json(settings);
});

app.get("/api/admin/portfolio", requireAdmin, async (_req, res) => {
  const portfolio = await readPortfolio();
  res.json(portfolio);
});

app.put("/api/admin/portfolio", requireAdmin, async (req, res) => {
  const next = await writePortfolio(req.body || {});
  res.json(next);
});

app.get("/api/admin/site-settings", requireAdmin, async (_req, res) => {
  const settings = await readSiteSettings();
  res.json(settings);
});

app.put("/api/admin/site-settings", requireAdmin, async (req, res) => {
  const next = await writeSiteSettings(req.body || {});
  res.json(next);
});

app.get("/api/admin/login-attempts", requireAdmin, async (req, res) => {
  const attempts = await readLoginAttempts();
  const status = String(req.query.status || "").toLowerCase();
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const filtered = status
    ? attempts.filter((entry) => entry.outcome === status)
    : attempts;
  res.json(filtered.slice(0, limit));
});

if (NODE_ENV === "production") {
  const distPath = path.resolve(process.cwd(), "dist");
  app.use("/admin", (req, res, next) => {
    if (!req.session?.user?.email) {
      return res.redirect("/login");
    }
    return next();
  });
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

if (!isVercelRuntime) {
  app.listen(PORT, () => {
    console.log(`Admin server running on http://localhost:${PORT}`);
  });
}

export default app;
