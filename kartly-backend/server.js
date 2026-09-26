require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
const app = express();
const PORT = process.env.PORT || 4000;
if (!process.env.JWT_SECRET || !process.env.ADMIN_KEY) {
  throw new Error("JWT_SECRET aur ADMIN_KEY .env file mein set karo");
}
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_KEY = process.env.ADMIN_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const mailer = process.env.EMAIL_USER && process.env.EMAIL_PASS
  ? nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  })
  : null;
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://kartlyshoping.vercel.app",
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
// ---------------------------------------------------------------------------
// Data files — simple JSON-file storage, good enough for a demo/small project.
// ---------------------------------------------------------------------------
const DATA_DIR = path.join(__dirname, "data");
const PRODUCTS_PATH = path.join(DATA_DIR, "products.json");
const ORDERS_PATH = path.join(DATA_DIR, "orders.json");
const USERS_PATH = path.join(DATA_DIR, "users.json");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    return fallback;
  }
}

let products = readJson(PRODUCTS_PATH, []);
let orders = readJson(ORDERS_PATH, []);
let users = readJson(USERS_PATH, []);
const COUPONS_PATH = path.join(DATA_DIR, "coupons.json");
let coupons = readJson(COUPONS_PATH, []);
function saveCoupons() {
  fs.writeFileSync(COUPONS_PATH, JSON.stringify(coupons, null, 2));
}

const CARD_DISCOUNT_PERCENT = 5;

function calculateCoupon(code, subtotal) {
  if (!code) return { discount: 0, coupon: null };
  const coupon = coupons.find((c) => c.code.toUpperCase() === code.toUpperCase() && c.active);
  if (!coupon) return { discount: 0, coupon: null, error: "Invalid or inactive coupon code" };
  const discount = coupon.type === "percent"
    ? Math.round((subtotal * coupon.value) / 100)
    : Math.min(coupon.value, subtotal);
  return { discount, coupon };
}
app.post("/api/coupons/validate", (req, res) => {
  const { code, subtotal } = req.body;
  const { discount, coupon, error } = calculateCoupon(code, subtotal || 0);
  if (error) return res.status(400).json({ error });
  res.json({ code: coupon.code, discount });
});
function saveProducts() {
  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2));
}
function saveOrders() {
  fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2));
}
function saveUsers() {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}

// Never send password hashes (or full internals) to the client.
function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}
// Works out where the order currently is, based on how much time has
// passed toward its estimated delivery — no real courier is connected,
// this is a time-based simulation for demo purposes.
function getTrackingStage(order) {
  if (order.status === "cancelled") return "cancelled";
  if (order.status === "delivered") return "delivered";
  const now = Date.now();
  const created = new Date(order.createdAt).getTime();
  const eta = new Date(order.estimatedDelivery).getTime();
  const totalMs = eta - created;
  const elapsed = now - created;
  const pct = totalMs > 0 ? elapsed / totalMs : 1;
  if (pct >= 1) return "delivered";
  if (pct >= 0.66) return "shipped";
  if (pct >= 0.33) return "packed";
  return "placed";
}
// Simulated warehouse network — since there's no real logistics system,
// each order gets assigned a pickup warehouse at checkout time.
const WAREHOUSES = [
  { name: "Delhi Fulfillment Center", city: "Delhi" },
  { name: "Mumbai Fulfillment Center", city: "Mumbai" },
  { name: "Bangalore Fulfillment Center", city: "Bangalore" },
];

function getLocationInfo(order) {
  const warehouse = order.pickupWarehouse || WAREHOUSES[0].name;
  const stage = getTrackingStage(order);
  if (stage === "cancelled") return { warehouse, currentLocation: "Order cancelled" };
  if (stage === "placed") return { warehouse, currentLocation: `Order confirmed — being prepared at ${warehouse}` };
  if (stage === "packed") return { warehouse, currentLocation: `Packed and ready at ${warehouse}` };
  if (stage === "shipped") return { warehouse, currentLocation: `In transit from ${warehouse} to ${order.address?.city || "your city"}` };
  return { warehouse, currentLocation: `Delivered to ${order.address?.city || "your address"}` };
}
// Auto-progresses a pending refund to "processed" after a short window —
// simulating a bank/payment gateway completing the refund. Admin can still
// mark it processed manually any time before that via the admin panel.
function getRefundStatus(order) {
  if (!order.refund) return null;
  if (order.refund.status === "not_applicable") return "not_applicable";
  if (order.refund.status === "processed") return "processed";
  const requestedAt = new Date(order.refund.requestedAt || order.createdAt).getTime();
  const minutesElapsed = (Date.now() - requestedAt) / (1000 * 60);
  return minutesElapsed >= 3 ? "processed" : "pending"; // auto-completes after 3 minutes for this demo
}
// ---- Customer support tickets ----
const SUPPORT_PATH = path.join(DATA_DIR, "support.json");
let supportTickets = readJson(SUPPORT_PATH, []);
function saveSupportTickets() {
  fs.writeFileSync(SUPPORT_PATH, JSON.stringify(supportTickets, null, 2));
}

app.post("/api/support", (req, res) => {
  const { name, email, subject, message, orderNumber } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "name, email, and message are required" });
  }
  const ticket = {
    id: supportTickets.length + 1,
    name,
    email,
    subject: subject || "General inquiry",
    message,
    orderNumber: orderNumber || null,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  supportTickets.push(ticket);
  saveSupportTickets();
  res.json({ ticket });
});

app.get("/api/admin/support", requireAdmin, (req, res) => res.json(supportTickets));
app.get("/api/admin/coupons", requireAdmin, (req, res) => res.json(coupons));

app.post("/api/admin/coupons", requireAdmin, (req, res) => {
  const { code, type, value } = req.body;
  if (!code || !["percent", "flat"].includes(type) || typeof value !== "number") {
    return res.status(400).json({ error: "code, type (percent/flat), and value (number) are required" });
  }
  if (coupons.find((c) => c.code.toUpperCase() === code.toUpperCase())) {
    return res.status(409).json({ error: "A coupon with this code already exists" });
  }
  const coupon = { code: code.toUpperCase(), type, value, active: true };
  coupons.push(coupon);
  saveCoupons();
  res.json(coupon);
});

app.put("/api/admin/coupons/:code/toggle", requireAdmin, (req, res) => {
  const coupon = coupons.find((c) => c.code === req.params.code.toUpperCase());
  if (!coupon) return res.status(404).json({ error: "Coupon not found" });
  coupon.active = !coupon.active;
  saveCoupons();
  res.json(coupon);
});

app.delete("/api/admin/coupons/:code", requireAdmin, (req, res) => {
  coupons = coupons.filter((c) => c.code !== req.params.code.toUpperCase());
  saveCoupons();
  res.json({ deleted: true });
});
app.put("/api/admin/support/:id/status", requireAdmin, (req, res) => {
  const ticket = supportTickets.find((t) => t.id === Number(req.params.id));
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  const { status } = req.body;
  if (!["open", "resolved"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  ticket.status = status;
  saveSupportTickets();
  res.json({ ticket });
});
// ---------------------------------------------------------------------------
// Carts — in-memory, keyed by sessionId (works for both guests and logged-in
// users; a logged-in user's sessionId gets linked to their account on login).
// ---------------------------------------------------------------------------
const carts = {};

function getCart(sessionId) {
  if (!carts[sessionId]) carts[sessionId] = {};
  return carts[sessionId];
}

function cartToItems(sessionId) {
  const cart = getCart(sessionId);
  return Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([productId, qty]) => {
      const product = products.find((p) => p.id === Number(productId));
      return product ? { ...product, qty } : null;
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
function signToken(user) {
  return jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
}

// Attaches req.user if a valid token is present; does NOT block the request.
function attachUser(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = users.find((u) => u.id === payload.userId) || null;
    } catch (e) {
      req.user = null;
    }
  }
  next();
}
app.use(attachUser);

// Blocks the request unless logged in.
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Please log in first" });
  next();
}

// Blocks the request unless the correct admin key is sent.
function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return res.status(401).json({ error: "Invalid or missing admin key" });
  }
  next();
}

// =============================================================================
// Health
// =============================================================================
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// =============================================================================
// Products (public read)
// =============================================================================
app.get("/api/products", (req, res) => {
  const { category, q } = req.query;
  let result = products;
  if (category && category !== "All") result = result.filter((p) => p.category === category);
  if (q) {
    const query = q.toLowerCase();
    result = result.filter((p) => p.name.toLowerCase().includes(query));
  }
  res.json(result);
});

app.get("/api/products/:id", (req, res) => {
  const product = products.find((p) => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json({
    ...product,
    description: product.description || `A quality pick from our ${product.category} collection — carefully chosen, fairly priced, and ready to ship.`,
  });
});

// =============================================================================
// Auth: register / login / Google sign-in / current user
// =============================================================================

// Register with email + password
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: uuidv4(),
    name,
    email,
    passwordHash,
    provider: "password",
    addresses: [],
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers();
  res.json({ user: publicUser(user), token: signToken(user) });
});

// Login with email + password
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email.toLowerCase() === (email || "").toLowerCase());
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const ok = await bcrypt.compare(password || "", user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });
  res.json({ user: publicUser(user), token: signToken(user) });
});
// Forgot password — code user ke registered email par bheja jata hai.
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = users.find((u) => u.email.toLowerCase() === (email || "").toLowerCase());

  if (user && user.passwordHash) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = code;
    user.resetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    saveUsers();

    if (mailer) {
      try {
        await mailer.sendMail({
          from: `"Kartly" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: "Kartly password reset code",
          text: `Aapka password reset code: ${code}\nYe 15 minute tak valid hai. Agar aapne request nahi ki, to is email ko ignore karein.`,
        });
      } catch (e) {
        console.error("Email send failed:", e.message);
      }
    } else {
      console.log(`(Email set nahi hai) Reset code for ${user.email}: ${code}`);
    }
  }

  // Hamesha same jawab, chahe email registered ho ya nahi.
  res.json({ message: "If that email exists, a reset code has been sent." });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;
  const user = users.find((u) => u.email.toLowerCase() === (email || "").toLowerCase());
  if (!user || !user.resetCode || user.resetCode !== code || Date.now() > user.resetExpires) {
    return res.status(400).json({ error: "Invalid or expired reset code" });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  delete user.resetCode;
  delete user.resetExpires;
  saveUsers();
  res.json({ message: "Password updated — you can log in now." });
});
// Sign in with Google — frontend sends the ID token it got from Google Sign-In.
// Requires GOOGLE_CLIENT_ID to be set in .env, from your own OAuth Client ID
// created in Google Cloud Console.
app.post("/api/auth/google", async (req, res) => {
  if (!googleClient) {
    return res.status(500).json({
      error: "Google sign-in isn't configured. Set GOOGLE_CLIENT_ID in the backend's .env file.",
    });
  }
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: "idToken is required" });

  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    let user = users.find((u) => u.email.toLowerCase() === payload.email.toLowerCase());
    if (!user) {
      user = {
        id: uuidv4(),
        name: payload.name,
        email: payload.email,
        passwordHash: null,
        provider: "google",
        addresses: [],
        createdAt: new Date().toISOString(),
      };
      users.push(user);
      saveUsers();
    }
    res.json({ user: publicUser(user), token: signToken(user) });
  } catch (e) {
    res.status(401).json({ error: "Invalid Google token" });
  }
});

// Current logged-in user
app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// =============================================================================
// Delivery addresses (requires login)
// =============================================================================
app.get("/api/users/me/addresses", requireAuth, (req, res) => {
  res.json({ addresses: req.user.addresses || [] });
});
// =============================================================================
// Wishlist (requires login)
// =============================================================================
app.get("/api/users/me/wishlist", requireAuth, (req, res) => {
  const ids = req.user.wishlist || [];
  const items = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  res.json({ items });
});

app.post("/api/users/me/wishlist", requireAuth, (req, res) => {
  const { productId } = req.body;
  if (!products.find((p) => p.id === Number(productId))) {
    return res.status(404).json({ error: "Product not found" });
  }
  req.user.wishlist = req.user.wishlist || [];
  if (!req.user.wishlist.includes(Number(productId))) {
    req.user.wishlist.push(Number(productId));
    saveUsers();
  }
  res.json({ wishlist: req.user.wishlist });
});

app.delete("/api/users/me/wishlist/:productId", requireAuth, (req, res) => {
  req.user.wishlist = (req.user.wishlist || []).filter((id) => id !== Number(req.params.productId));
  saveUsers();
  res.json({ wishlist: req.user.wishlist });
});
app.post("/api/users/me/addresses", requireAuth, (req, res) => {
  const { label, line1, line2, city, state, pincode, phone } = req.body;
  if (!line1 || !city || !pincode || !phone) {
    return res.status(400).json({ error: "line1, city, pincode, and phone are required" });
  }
  const address = {
    id: uuidv4(),
    label: label || "Home",
    line1,
    line2: line2 || "",
    city,
    state: state || "",
    pincode,
    phone,
  };
  req.user.addresses = req.user.addresses || [];
  req.user.addresses.push(address);
  saveUsers();
  res.json({ addresses: req.user.addresses });
});

app.put("/api/users/me/addresses/:addressId", requireAuth, (req, res) => {
  const addr = (req.user.addresses || []).find((a) => a.id === req.params.addressId);
  if (!addr) return res.status(404).json({ error: "Address not found" });
  Object.assign(addr, req.body, { id: addr.id });
  saveUsers();
  res.json({ addresses: req.user.addresses });
});

app.delete("/api/users/me/addresses/:addressId", requireAuth, (req, res) => {
  req.user.addresses = (req.user.addresses || []).filter((a) => a.id !== req.params.addressId);
  saveUsers();
  res.json({ addresses: req.user.addresses });
});

// =============================================================================
// Cart (works for guests via sessionId, or logged-in users the same way)
// =============================================================================
app.post("/api/session", (req, res) => res.json({ sessionId: uuidv4() }));

app.get("/api/cart/:sessionId", (req, res) => {
  const items = cartToItems(req.params.sessionId);
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  res.json({ items, subtotal });
});

app.post("/api/cart/:sessionId", (req, res) => {
  const { productId, qty = 1 } = req.body;
  const product = products.find((p) => p.id === Number(productId));
  if (!product) return res.status(404).json({ error: "Product not found" });
  const cart = getCart(req.params.sessionId);
  cart[productId] = (cart[productId] || 0) + qty;
  const items = cartToItems(req.params.sessionId);
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  res.json({ items, subtotal });
});

app.put("/api/cart/:sessionId/:productId", (req, res) => {
  const { qty } = req.body;
  if (typeof qty !== "number" || qty < 0) {
    return res.status(400).json({ error: "qty must be a non-negative number" });
  }
  const cart = getCart(req.params.sessionId);
  cart[req.params.productId] = qty;
  const items = cartToItems(req.params.sessionId);
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  res.json({ items, subtotal });
});

app.delete("/api/cart/:sessionId/:productId", (req, res) => {
  const cart = getCart(req.params.sessionId);
  delete cart[req.params.productId];
  const items = cartToItems(req.params.sessionId);
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  res.json({ items, subtotal });
});

// =============================================================================
// Checkout — now takes a delivery address and a (mock) payment method.
// No real payment gateway is wired up: this just records what the shopper
// chose, the same way a real store would before actually charging the card.
// =============================================================================
app.post("/api/checkout/:sessionId", (req, res) => {
  const items = cartToItems(req.params.sessionId);
  if (items.length === 0) return res.status(400).json({ error: "Cart is empty" });

  const { address, paymentMethod, giftWrap, deliverySlot, couponCode } = req.body;
  if (!address || !address.line1 || !address.city || !address.pincode || !address.phone) {
    return res.status(400).json({ error: "A delivery address (line1, city, pincode, phone) is required" });
  }
  if (!paymentMethod || !["cod", "card", "upi"].includes(paymentMethod.type)) {
    return res.status(400).json({ error: "paymentMethod.type must be one of: cod, card, upi" });
  }

   const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const giftWrapFee = giftWrap ? 30 : 0;

  const { discount: couponDiscount, coupon, error: couponError } = calculateCoupon(couponCode, subtotal);
  if (couponCode && couponError) return res.status(400).json({ error: couponError });

  const cardDiscount = paymentMethod?.type === "card"
    ? Math.round((subtotal * CARD_DISCOUNT_PERCENT) / 100)
    : 0;

  const total = Math.max(0, subtotal + giftWrapFee - couponDiscount - cardDiscount);

  const createdAt = new Date();
  const etaDays = 4 + (orders.length % 3);
  const estimatedDelivery = new Date(createdAt.getTime() + etaDays * 24 * 60 * 60 * 1000);
  const pickupWarehouse = WAREHOUSES[Math.floor(Math.random() * WAREHOUSES.length)].name;
  const order = {
    id: orders.length + 1,
    orderNumber: Math.floor(100000 + Math.random() * 900000),
    sessionId: req.params.sessionId,
    userId: req.user ? req.user.id : null,
    items: items.map((i) => ({ productId: i.id, name: i.name, qty: i.qty, price: i.price })),
    subtotal,
    address,
    paymentMethod,
    giftWrap: !!giftWrap,
    giftWrapFee,
    couponCode: coupon ? coupon.code : null,
    couponDiscount,
    cardDiscount,
    total,
    deliverySlot: deliverySlot || null,
    refund: null,
    status: "placed",
    pickupWarehouse,
    estimatedDelivery: estimatedDelivery.toISOString(),
    createdAt: createdAt.toISOString(),
  };
  orders.push(order);
  saveOrders();
  carts[req.params.sessionId] = {};

  res.json({ order: { ...order, trackingStage: getTrackingStage(order), ...getLocationInfo(order), refundStatus: getRefundStatus(order) } });
});
app.get("/api/orders/:sessionId", (req, res) => {
  const result = orders.filter((o) => o.sessionId === req.params.sessionId)
    .map((o) => ({ ...o, trackingStage: getTrackingStage(o), ...getLocationInfo(o), refundStatus: getRefundStatus(o) }));
  res.json(result);
});

// Logged-in user's own order history (across devices/sessions)
app.get("/api/users/me/orders", requireAuth, (req, res) => {
  const result = orders.filter((o) => o.userId === req.user.id)
    .map((o) => ({ ...o, trackingStage: getTrackingStage(o), ...getLocationInfo(o), refundStatus: getRefundStatus(o) }));
  res.json(result);
});
app.put("/api/users/me/orders/:orderId/cancel", requireAuth, (req, res) => {
  const order = orders.find((o) => o.id === Number(req.params.orderId) && o.userId === req.user.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.status === "delivered") {
    return res.status(400).json({ error: "Delivered orders can't be cancelled" });
  }
  if (order.status === "cancelled") {
    return res.status(400).json({ error: "Order is already cancelled" });
  }
  order.status = "cancelled";
  order.refund = order.paymentMethod?.type === "cod"
    ? { status: "not_applicable", note: "Cash on delivery — nothing was charged" }
    : { status: "pending", requestedAt: new Date().toISOString() };
  saveOrders();
  res.json({ order: { ...order, trackingStage: getTrackingStage(order), refundStatus: getRefundStatus(order) } });
});
app.post("/api/users/me/orders/:orderId/return", requireAuth, (req, res) => {
  const order = orders.find((o) => o.id === Number(req.params.orderId) && o.userId === req.user.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (getTrackingStage(order) !== "delivered") {
    return res.status(400).json({ error: "Only delivered orders can be returned" });
  }
  if (order.returnRequest) {
    return res.status(400).json({ error: "A return request already exists for this order" });
  }
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: "Please give a reason for the return" });

  order.returnRequest = {
    reason,
    status: "pending", // pending -> approved / rejected
    requestedAt: new Date().toISOString(),
  };
  saveOrders();
  res.json({ order: { ...order, trackingStage: getTrackingStage(order), ...getLocationInfo(order) } });
});
// =============================================================================
// Admin — view and manage everything. Protected by a shared secret key sent
// as the "x-admin-key" header (set ADMIN_KEY in .env). This is a lightweight
// stand-in for real admin auth — fine for a personal project, not for
// production with real customer data.
// =============================================================================
app.get("/api/admin/products", requireAdmin, (req, res) => res.json(products));

app.post("/api/admin/products", requireAdmin, (req, res) => {
  const { name, category, price, rating, tag } = req.body;
  if (!name || !category || typeof price !== "number") {
    return res.status(400).json({ error: "name, category, and price (number) are required" });
  }
  const nextId = products.length ? Math.max(...products.map((p) => p.id)) + 1 : 1;
  const product = { id: nextId, name, category, price, rating: rating || 0, tag: tag || null };
  products.push(product);
  saveProducts();
  res.json(product);
});

app.put("/api/admin/products/:id", requireAdmin, (req, res) => {
  const product = products.find((p) => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  Object.assign(product, req.body, { id: product.id });
  saveProducts();
  res.json(product);
});

app.delete("/api/admin/products/:id", requireAdmin, (req, res) => {
  products = products.filter((p) => p.id !== Number(req.params.id));
  saveProducts();
  res.json({ deleted: true });
});

app.get("/api/admin/orders", requireAdmin, (req, res) => {
  res.json(orders.map((o) => ({ ...o, trackingStage: getTrackingStage(o), ...getLocationInfo(o), refundStatus: getRefundStatus(o) })));
});

app.put("/api/admin/orders/:id/status", requireAdmin, (req, res) => {
  const order = orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ error: "Order not found" });
  const { status } = req.body;
  if (!["placed", "packed", "shipped", "delivered", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  order.status = status;
  if (status === "cancelled" && !order.refund) {
    order.refund = order.paymentMethod?.type === "cod"
      ? { status: "not_applicable", note: "Cash on delivery — nothing was charged" }
      : { status: "pending", requestedAt: new Date().toISOString() };
  }
  saveOrders();
  res.json(order);
});
app.put("/api/admin/orders/:id/return-status", requireAdmin, (req, res) => {
  const order = orders.find((o) => o.id === Number(req.params.id));
  if (!order || !order.returnRequest) return res.status(404).json({ error: "No return request found for this order" });
  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  order.returnRequest.status = status;

  // Approving a return automatically starts the refund process too.
  if (status === "approved" && !order.refund) {
    order.refund = order.paymentMethod?.type === "cod"
      ? { status: "not_applicable", note: "Cash on delivery — refund handled separately" }
      : { status: "pending", requestedAt: new Date().toISOString() };
  }

  saveOrders();
  res.json({ order: { ...order, trackingStage: getTrackingStage(order), refundStatus: getRefundStatus(order) } });
});
app.put("/api/admin/orders/:id/refund-status", requireAdmin, (req, res) => {
  const order = orders.find((o) => o.id === Number(req.params.id));
  if (!order || !order.refund) return res.status(404).json({ error: "No refund to process for this order" });
  const { status } = req.body;
  if (!["pending", "processed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  order.refund.status = status;
  saveOrders();
  res.json({ order });
});
app.get("/api/admin/users", requireAdmin, (req, res) => res.json(users.map(publicUser)));

app.listen(PORT, () => {
  console.log(`Kartly backend running on http://localhost:${PORT}`);
  if (!GOOGLE_CLIENT_ID) {
    console.log("Note: GOOGLE_CLIENT_ID is not set — Google sign-in will not work until you add it to .env");
  }
});
