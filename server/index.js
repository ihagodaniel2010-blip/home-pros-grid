import "dotenv/config";
import express from "express";
import session from "express-session";
import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { readSiteSettings, writeSiteSettings } from "./site-settings.store.js";
import { sendTransactionalEmail } from "./email-provider.js";

const app = express();
const PORT = Number(process.env.PORT || 8787);

const normalizeEnv = (value, fallback = "") => {
  const text = String(value ?? fallback).trim();
  return text.replace(/^['\"]+|['\"]+$/g, "");
};

const ADMIN_EMAIL = normalizeEnv(process.env.ADMIN_EMAIL, "admin@homepros.com").toLowerCase();
const SESSION_SECRET = normalizeEnv(process.env.SESSION_SECRET, "ha-construction-default-session-secret-2026");
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

app.get("/api/reviews", async (req, res) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const placeId = process.env.GOOGLE_PLACE_ID?.trim();

  if (!apiKey || !placeId) {
    return res.json({
      configured: false,
      rating: null,
      userRatingCount: null,
      reviews: []
    });
  }

  try {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "displayName,rating,userRatingCount,reviews,googleMapsUri",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      return res.json({
        configured: false,
        rating: null,
        userRatingCount: null,
        reviews: []
      });
    }

    const data = await response.json();
    const mappedReviews = Array.isArray(data.reviews)
      ? data.reviews.slice(0, 5).map((rev) => ({
          authorName: rev.authorAttribution?.displayName || "Google Customer",
          authorPhotoUri: rev.authorAttribution?.photoUri || undefined,
          authorUri: rev.authorAttribution?.uri || undefined,
          rating: typeof rev.rating === "number" ? rev.rating : 5,
          text: rev.text?.text || "",
          relativePublishTimeDescription: rev.relativePublishTimeDescription || "",
          publishTime: rev.publishTime || undefined
        }))
      : [];

    return res.json({
      configured: true,
      businessName: data.displayName?.text || "H & A Construction LLC",
      rating: typeof data.rating === "number" ? Math.round(data.rating * 10) / 10 : null,
      userRatingCount: typeof data.userRatingCount === "number" ? data.userRatingCount : null,
      reviews: mappedReviews,
      googleMapsUri: data.googleMapsUri || undefined
    });
  } catch (err) {
    return res.json({
      configured: false,
      rating: null,
      userRatingCount: null,
      reviews: []
    });
  }
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

// =============================
// RESEND EMAIL DISPATCH (FASE 9.1)
// =============================
app.get("/api/admin/email-provider-status", (req, res) => {
  const isConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim());
  const fromEmail = process.env.RESEND_FROM_EMAIL || "H&A Construction <no-reply@h-a-construction.com>";
  res.json({
    configured: isConfigured,
    provider: "Resend",
    fromEmail
  });
});

app.post("/api/admin/send-test-email", async (req, res) => {
  const apiKey = process.env.RESEND_API_KEY;
  const { templateId, toEmail, variables, subject, bodyText, bodyHtml } = req.body || {};

  if (!apiKey || !apiKey.trim()) {
    return res.json({
      success: false,
      configured: false,
      message: "RESEND_API_KEY is not configured in environment variables. Real email dispatch disabled."
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!toEmail || !emailRegex.test(String(toEmail).trim())) {
    return res.status(400).json({
      success: false,
      configured: true,
      message: "Invalid recipient email address format."
    });
  }

  if (!templateId || typeof templateId !== "string") {
    return res.status(400).json({
      success: false,
      configured: true,
      message: "templateId parameter is required."
    });
  }

  try {
    const result = await sendTransactionalEmail({
      templateId,
      toEmail: String(toEmail).trim(),
      variables: variables || {},
      customSubject: subject,
      customBodyText: bodyText,
      customBodyHtml: bodyHtml
    });
    return res.json(result);
  } catch (err) {
    console.error("Error sending test email route:", err);
    return res.status(500).json({
      success: false,
      configured: true,
      message: err.message || "Failed to dispatch test email."
    });
  }
});

// =============================
// TWILIO SMS DISPATCH (FASE 10)
// =============================
app.get("/api/admin/sms-provider-status", (req, res) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const isConfigured = Boolean(accountSid && accountSid.trim() && authToken && authToken.trim() && fromNumber && fromNumber.trim());

  res.json({
    configured: isConfigured,
    provider: "Twilio",
    fromNumber: fromNumber || null
  });
});

app.post("/api/admin/send-sms", async (req, res) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const { toPhone, message } = req.body || {};

  if (!accountSid || !authToken || !fromNumber || !accountSid.trim() || !authToken.trim() || !fromNumber.trim()) {
    return res.json({
      success: false,
      configured: false,
      message: "Twilio provider is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in environment variables."
    });
  }

  if (!toPhone || String(toPhone).trim().length < 7) {
    return res.status(400).json({
      success: false,
      configured: true,
      message: "Invalid recipient phone number format."
    });
  }

  if (!message || typeof message !== "string") {
    return res.status(400).json({
      success: false,
      configured: true,
      message: "Message payload parameter is required."
    });
  }

  try {
    const params = new URLSearchParams();
    params.append("To", String(toPhone).trim());
    params.append("From", String(fromNumber).trim());
    params.append("Body", String(message).trim());

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid.trim()}/Messages.json`;
    const authHeader = "Basic " + Buffer.from(`${accountSid.trim()}:${authToken.trim()}`).toString("base64");

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Twilio API Dispatch Error:", data);
      return res.status(400).json({
        success: false,
        configured: true,
        message: data.message || data.more_info || "Failed to dispatch SMS via Twilio API."
      });
    }

    return res.json({
      success: true,
      configured: true,
      sid: data.sid,
      message: "SMS sent successfully."
    });
  } catch (err) {
    console.error("SMS dispatch server error:", err);
    return res.status(500).json({
      success: false,
      configured: true,
      message: err.message || "Failed to dispatch SMS message."
    });
  }
});

// =============================
// STRIPE CREDIT TOP-UP ENDPOINTS (FASE 9.3)
// =============================
const ALLOWED_CREDIT_PACKAGES = {
  credit_50: { id: "credit_50", name: "$50 Credits", amount: 5000, credits: 50 },
  credit_100: { id: "credit_100", name: "$100 Credits", amount: 10000, credits: 100 },
  credit_250: { id: "credit_250", name: "$250 Credits", amount: 25000, credits: 250 },
  credit_500: { id: "credit_500", name: "$500 Credits", amount: 50000, credits: 500 }
};

app.get("/api/billing/stripe-status", (req, res) => {
  const isConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.trim());
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
  res.json({
    configured: isConfigured,
    mode: "test",
    publishableKey: publishableKey ? "Configured (Public Key)" : null
  });
});

app.post("/api/billing/create-checkout-session", async (req, res) => {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.h-a-construction.com";
  const { packageId, organizationId, userRole } = req.body || {};

  if (userRole === "worker") {
    return res.status(403).json({
      success: false,
      message: "Workers are restricted from acquiring lead credits."
    });
  }

  const pkg = ALLOWED_CREDIT_PACKAGES[packageId];
  if (!pkg) {
    return res.status(400).json({
      success: false,
      message: "Invalid or unsupported credit package ID. Custom arbitrary amounts are not allowed."
    });
  }

  if (!apiKey || !apiKey.trim()) {
    return res.json({
      success: false,
      configured: false,
      message: "STRIPE_SECRET_KEY is not configured in environment variables. Sandbox mode ready."
    });
  }

  try {
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", `${siteUrl}/admin/billing?session_id={CHECKOUT_SESSION_ID}&success=true`);
    params.append("cancel_url", `${siteUrl}/admin/billing?canceled=true`);
    params.append("line_items[0][price_data][currency]", "usd");
    params.append("line_items[0][price_data][product_data][name]", `H&A Construction Lead Credits — ${pkg.name}`);
    params.append("line_items[0][price_data][unit_amount]", String(pkg.amount));
    params.append("line_items[0][quantity]", "1");
    params.append("metadata[organization_id]", String(organizationId || ""));
    params.append("metadata[package_id]", pkg.id);
    params.append("metadata[credits]", String(pkg.credits));

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(400).json({
        success: false,
        configured: true,
        message: data.error?.message || "Failed to create Stripe Checkout session."
      });
    }

    return res.json({
      success: true,
      configured: true,
      url: data.url,
      sessionId: data.id
    });
  } catch (err) {
    console.error("Stripe Checkout Error:", err);
    return res.status(500).json({
      success: false,
      configured: true,
      message: err.message || "Failed to connect to Stripe API."
    });
  }
});

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn("Stripe Webhook Notice: STRIPE_WEBHOOK_SECRET not configured.");
    return res.json({ received: true, processed: false, reason: "Webhook secret unconfigured" });
  }

  let event;
  try {
    const rawBody = typeof req.body === "string" || Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : JSON.stringify(req.body);

    event = JSON.parse(rawBody);
  } catch (err) {
    console.error("Stripe Webhook Parsing Error:", err.message);
    return res.status(400).json({ error: "Webhook Error: Invalid payload format" });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object || {};
    const paymentStatus = session.payment_status;
    const metadata = session.metadata || {};
    const organizationId = metadata.organization_id;
    const packageId = metadata.package_id;

    if (paymentStatus !== "paid") {
      console.log(`Stripe Webhook Notice: Session ${session.id} payment status is ${paymentStatus}. Skipping credit.`);
      return res.json({ received: true, processed: false, reason: "Payment status not paid" });
    }

    const pkg = ALLOWED_CREDIT_PACKAGES[packageId];
    if (!pkg) {
      console.error(`Stripe Webhook Error: Invalid package_id '${packageId}' in session ${session.id}.`);
      return res.status(400).json({ error: "Invalid package_id in session metadata" });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ozhjvprhhsdglxokfwze.supabase.co";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey || !serviceRoleKey.trim()) {
      console.warn("Stripe Webhook Notice: SUPABASE_SERVICE_ROLE_KEY missing server-side.");
      return res.json({ received: true, processed: false, reason: "SUPABASE_SERVICE_ROLE_KEY unconfigured" });
    }

    try {
      const supabaseAdmin = createClient(supabaseUrl.trim(), serviceRoleKey.trim(), {
        auth: { persistSession: false }
      });

      const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc("record_stripe_credit_topup", {
        p_organization_id: organizationId,
        p_amount: pkg.credits,
        p_stripe_session_id: session.id,
        p_package_id: pkg.id
      });

      if (rpcErr) {
        console.error("Stripe Webhook RPC Error:", rpcErr.message);
        return res.status(500).json({ error: "Failed to record credit topup via RPC" });
      }

      console.log(`Stripe Webhook Success: Session ${session.id} credited. Result:`, rpcResult);
      return res.json({
        received: true,
        processed: true,
        duplicate: Boolean(rpcResult?.duplicate),
        ledger_id: rpcResult?.ledger_id,
        new_balance: rpcResult?.new_balance
      });
    } catch (err) {
      console.error("Stripe Webhook Execution Error:", err.message);
      return res.status(500).json({ error: "Internal webhook processing error" });
    }
  }

  return res.json({ received: true, processed: true, event: event.type });
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
