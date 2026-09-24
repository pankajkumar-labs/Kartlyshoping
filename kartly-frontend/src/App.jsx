import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  ShoppingCart,
  X,
  Plus,
  Minus,
  Star,
  Trash2,
  Check,
  ArrowLeft,
  WifiOff,
  User,
  LogOut,
   MapPin,
  CreditCard,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Headphones,
  Heart,
} from "lucide-react";

const API_BASE = "http://localhost:4000/api";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const CATEGORIES = ["All", "Electronics", "Home & Kitchen", "Fashion", "Grocery"];
// Maps each default product id to a real-photo keyword (via a free keyword-based
// photo service) so images actually look like the product, not random photos.
// If you add new products via the admin API, add their id here too — otherwise
// they'll fall back to a generic "product" photo.
const IMAGE_KEYWORDS = {
  1: "wireless-earbuds",
  2: "cast-iron-skillet",
  3: "cotton-tshirt",
  4: "pour-over-coffee",
  5: "mechanical-keyboard",
  6: "weekender-bag",
  7: "coffee-beans",
  8: "snake-plant",
  9: "running-socks",
  10: "power-bank",
  11: "mixing-bowls",
  12: "trail-mix",
  13: "bluetooth-speaker",
  14: "denim-jacket",
  15: "frying-pan",
  16: "green-tea",
  17: "yoga-mat",
  18: "canvas-sneakers",
  19: "usb-charger",
  20: "bedsheet",
  21: "leather-wallet",
  22: "mixed-nuts",
  23: "wireless-mouse",
  24: "wool-scarf",
  25: "table-lamp",
};

function getProductImages(id) {
  const keyword = IMAGE_KEYWORDS[id] || "product";
  return [1, 2, 3].map((lock) => `https://loremflickr.com/600/600/${keyword}?lock=${id * 10 + lock}`);
}
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
const formatPrice = (cents) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(cents);

function PriceTag({ price }) {
  return (
    <div className="relative inline-flex items-center">
      <span className="font-mono text-sm font-bold px-2.5 py-1 rounded-sm" style={{ background: "#F2A93B", color: "#2B1E3D" }}>
        {formatPrice(price)}
      </span>
      <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ background: "#FBF9F6" }} />
    </div>
  );
}

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} fill={i <= rating ? "#1F7A5C" : "none"} stroke={i <= rating ? "#1F7A5C" : "#B4B2A9"} />
      ))}
    </div>
  );
}

function TextInput({ label, ...props }) {
  return (
    <label className="block text-xs mb-3">
      <span className="block mb-1" style={{ color: "#5F5E5A" }}>
        {label}
      </span>
      <input
        {...props}
        className="w-full text-sm px-3 py-2 rounded-md border outline-none"
        style={{ borderColor: "#B4B2A9", background: "#FFFFFF" }}
      />
    </label>
  );
}
function ProductDetailModal({ product, sessionId, qty, setQty, onClose, onAdded }) {
  const [full, setFull] = useState(product);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const images = getProductImages(product.id);
  useEffect(() => {
    setLoading(true);
    setAdded(false);
    fetch(`${API_BASE}/products/${product.id}`)
      .then((r) => r.json())
      .then((data) => setFull(data))
      .catch(() => setFull(product))
      .finally(() => setLoading(false));
  }, [product.id]);

  const addToCart = () => {
    if (!sessionId) return;
    setAdding(true);
    fetch(`${API_BASE}/cart/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, qty }),
    })
      .then((r) => r.json())
      .then((data) => {
        onAdded(data.items || [], data.subtotal || 0);
        setAdded(true);
      })
      .finally(() => setAdding(false));
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="absolute inset-0" style={{ background: "rgba(43,30,61,0.5)" }} onClick={onClose} />
      <div className="relative w-full max-w-md rounded-lg overflow-hidden max-h-[85vh] overflow-y-auto" style={{ background: "#FBF9F6" }}>
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(43,30,61,0.6)" }}>
          <X size={16} color="#FBF9F6" />
        </button>

        <img src={images[activeImg]} alt={product.name} className="w-full aspect-square object-cover" />
        <div className="flex gap-2 px-5 pt-3">
          {images.map((src, idx) => (
            <button
              key={idx}
              onClick={() => setActiveImg(idx)}
              className="w-14 h-14 rounded-md overflow-hidden border-2"
              style={{ borderColor: activeImg === idx ? "#2B1E3D" : "transparent" }}
            >
              <img src={src} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>

        <div className="p-5">
          {product.tag && (
            <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-sm mb-2" style={{ background: product.tag === "Sale" ? "#C23B3B" : "#1F7A5C", color: "#FBF9F6" }}>
              {product.tag}
            </span>
          )}
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "#888780" }}>{product.category}</p>
          <h2 style={{ fontFamily: "'Fraunces', serif", color: "#2B1E3D" }} className="text-2xl font-semibold mt-1 mb-2">
            {product.name}
          </h2>
          <Stars rating={product.rating} />

          <p className="text-sm mt-3 mb-4" style={{ color: "#5F5E5A" }}>
            {loading ? "Loading description…" : full.description}
          </p>

          <div className="flex items-center justify-between mb-4">
            <PriceTag price={product.price} />
            <div className="flex items-center gap-3">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 flex items-center justify-center rounded-full border" style={{ borderColor: "#B4B2A9" }}>
                <Minus size={14} />
              </button>
              <span className="text-sm font-medium w-4 text-center">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="w-8 h-8 flex items-center justify-center rounded-full border" style={{ borderColor: "#B4B2A9" }}>
                <Plus size={14} />
              </button>
            </div>
          </div>

          <button
            onClick={addToCart}
            disabled={adding}
            className="w-full py-3 rounded-md text-sm font-semibold disabled:opacity-60"
            style={{ background: added ? "#1F7A5C" : "#2B1E3D", color: "#FBF9F6" }}
          >
            {adding ? "Adding…" : added ? "Added to cart ✓" : `Add ${qty} to cart`}
          </button>
        </div>
      </div>
    </div>
  );
}
// ---------------------------------------------------------------------------
// Google Sign-In button — only renders if VITE_GOOGLE_CLIENT_ID is configured.
// Loads Google's script on demand and mounts their button into a div.
// ---------------------------------------------------------------------------
function GoogleSignInButton({ onCredential }) {
  const divRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    function render() {
      if (!window.google || !divRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => onCredential(response.credential),
      });
      window.google.accounts.id.renderButton(divRef.current, {
        theme: "outline",
        size: "large",
        width: 280,
      });
    }

    if (window.google) {
      render();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = render;
      document.body.appendChild(script);
    }
  }, [onCredential]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="text-xs text-center py-2 px-3 rounded-md" style={{ background: "#F1EFE8", color: "#888780" }}>
        Google sign-in isn't set up yet — add VITE_GOOGLE_CLIENT_ID to the frontend's .env (see README).
      </p>
    );
  }
  return <div ref={divRef} className="flex justify-center" />;
}

// ---------------------------------------------------------------------------
// Auth modal — login / register / Google
// ---------------------------------------------------------------------------
function AuthModal({ onClose, onAuthed }) {
  const [mode, setMode] = useState("login"); // 'login' | 'register' | 'forgot' | 'reset'
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");
    setBusy(true);
    try {
      if (mode === "forgot") {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Something went wrong");
       setInfoMsg("Agar ye email registered hai to reset code bhej diya gaya hai. Spam folder bhi check karein.");
setMode("reset");
return;
      }

      if (mode === "reset") {
        const res = await fetch(`${API_BASE}/auth/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code: resetCode, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Something went wrong");
        setInfoMsg("Password updated! You can log in now.");
        setMode("login");
        return;
      }

      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body = mode === "login" ? { email, password } : { name, email, password };
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      onAuthed(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleCredential = async (idToken) => {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Google sign-in failed");
      onAuthed(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="absolute inset-0" style={{ background: "rgba(43,30,61,0.5)" }} onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-lg p-6" style={{ background: "#FBF9F6" }}>
        <button onClick={onClose} className="absolute top-4 right-4">
          <X size={18} color="#2B1E3D" />
        </button>
        <h2 style={{ fontFamily: "'Fraunces', serif", color: "#2B1E3D" }} className="text-xl font-semibold mb-4">
          {mode === "login" && "Welcome back"}
          {mode === "register" && "Create your account"}
          {mode === "forgot" && "Reset your password"}
          {mode === "reset" && "Enter reset code"}
        </h2>
        {infoMsg && (
          <p className="text-xs mb-3 px-3 py-2 rounded-md" style={{ background: "#EAF3EF", color: "#1F7A5C" }}>{infoMsg}</p>
        )}

        <form onSubmit={submit}>
          {mode === "register" && (
            <TextInput label="Name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          )}
          {(mode === "login" || mode === "register" || mode === "forgot" || mode === "reset") && (
            <TextInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={mode === "reset"} />
          )}
          {(mode === "login" || mode === "register") && (
            <TextInput
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          )}
          {mode === "reset" && (
            <>
              <TextInput label="6-digit code" value={resetCode} onChange={(e) => setResetCode(e.target.value)} required maxLength={6} />
              <TextInput label="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
            </>
          )}
          {error && (
            <p className="text-xs mb-3 px-3 py-2 rounded-md" style={{ background: "#FBEAEA", color: "#C23B3B" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-md text-sm font-semibold mb-3 disabled:opacity-60"
            style={{ background: "#2B1E3D", color: "#FBF9F6" }}
          >
            {busy
              ? "Please wait…"
              : mode === "login"
              ? "Log in"
              : mode === "register"
              ? "Create account"
              : mode === "forgot"
              ? "Send reset code"
              : "Update password"}
          </button>
        </form>

        {mode === "login" && (
          <button
            type="button"
            onClick={() => { setMode("forgot"); setError(""); setInfoMsg(""); }}
            className="text-xs underline block mx-auto mb-2"
            style={{ color: "#5F5E5A" }}
          >
            Forgot password?
          </button>
        )}

        <div className="flex items-center gap-2 my-3">
          <div className="flex-1 h-px" style={{ background: "#E5E2D9" }} />
          <span className="text-[11px]" style={{ color: "#888780" }}>
            or
          </span>
          <div className="flex-1 h-px" style={{ background: "#E5E2D9" }} />
        </div>

        <GoogleSignInButton onCredential={handleGoogleCredential} />

        {(mode === "login" || mode === "register") && (
          <p className="text-xs text-center mt-4" style={{ color: "#5F5E5A" }}>
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="font-medium underline"
              style={{ color: "#2B1E3D" }}
            >
              {mode === "login" ? "Create an account" : "Log in"}
            </button>
          </p>
        )}
        {(mode === "forgot" || mode === "reset") && (
          <p className="text-xs text-center mt-4" style={{ color: "#5F5E5A" }}>
            <button type="button" onClick={() => { setMode("login"); setError(""); setInfoMsg(""); }} className="font-medium underline" style={{ color: "#2B1E3D" }}>
              Back to log in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Address form — used both for saving a new address and one-off guest checkout
// ---------------------------------------------------------------------------
function AddressForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(
    initial || { label: "Home", line1: "", line2: "", city: "", state: "", pincode: "", phone: "" }
  );
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="p-3 rounded-md border"
      style={{ borderColor: "#E5E2D9" }}
    >
      <TextInput label="Label (e.g. Home, Work)" value={form.label} onChange={set("label")} />
      <TextInput label="Address line 1" value={form.line1} onChange={set("line1")} required />
      <TextInput label="Address line 2 (optional)" value={form.line2} onChange={set("line2")} />
      <div className="grid grid-cols-2 gap-2">
        <TextInput label="City" value={form.city} onChange={set("city")} required />
        <TextInput label="State" value={form.state} onChange={set("state")} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TextInput label="Pincode" value={form.pincode} onChange={set("pincode")} required />
        <TextInput label="Phone" value={form.phone} onChange={set("phone")} required />
      </div>
      <div className="flex gap-2 mt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2 rounded-md text-xs font-semibold disabled:opacity-60"
          style={{ background: "#2B1E3D", color: "#FBF9F6" }}
        >
          {saving ? "Saving…" : "Save address"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-3 py-2 rounded-md text-xs border" style={{ borderColor: "#B4B2A9" }}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const STATUS_META = {
  placed: { label: "Order placed", icon: Clock, color: "#5F5E5A" },
  packed: { label: "Packed", icon: Package, color: "#5F5E5A" },
  shipped: { label: "Shipped", icon: Truck, color: "#1F7A5C" },
  delivered: { label: "Delivered", icon: CheckCircle2, color: "#1F7A5C" },
  cancelled: { label: "Cancelled", icon: X, color: "#C23B3B" },
};
const TRACKING_STEPS = ["placed", "packed", "shipped", "delivered"];
// ---------------------------------------------------------------------------
// Profile panel — account info, saved addresses, and order history with
// delivery status / ETA.
// ---------------------------------------------------------------------------
function ProfilePanel({ user, token, onClose, onAddressesChanged, initialTab, onNeedHelp }) {
  const [tab, setTab] = useState(initialTab || "orders"); // 'orders' | 'addresses'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [addingAddress, setAddingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
    const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnCategory, setReturnCategory] = useState("Wrong item received");
  const [returnDetails, setReturnDetails] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);
    const cancelOrder = (orderId) => {
    fetch(`${API_BASE}/users/me/orders/${orderId}/cancel`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "Couldn't cancel order");
        setOrders((prev) => prev.map((o) => (o.id === data.order.id ? data.order : o)));
        setSelectedOrder(data.order);
      })
      .catch((err) => alert(err.message));
  };
  useEffect(() => {
    fetch(`${API_BASE}/users/me/orders`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setOrders(Array.isArray(data) ? data.slice().reverse() : []))
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
  }, [token]);

  const saveNewAddress = (form) => {
    setSavingAddress(true);
    fetch(`${API_BASE}/users/me/addresses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    })
      .then((r) => r.json())
      .then((data) => {
        onAddressesChanged(data.addresses);
        setAddingAddress(false);
      })
      .finally(() => setSavingAddress(false));
  };

  const deleteAddress = (id) => {
    fetch(`${API_BASE}/users/me/addresses/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => onAddressesChanged(data.addresses));
  };

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <div className="absolute inset-0" style={{ background: "rgba(43,30,61,0.4)" }} onClick={onClose} />
      <div className="relative w-full max-w-md h-full flex flex-col overflow-y-auto" style={{ background: "#FBF9F6" }}>
        <div className="px-4 py-4 border-b" style={{ borderColor: "#E5E2D9" }}>
          <div className="flex items-center justify-between mb-1">
            <h2 style={{ fontFamily: "'Fraunces', serif", color: "#2B1E3D" }} className="text-lg font-semibold">
              My profile
            </h2>
            <button onClick={onClose}>
              <X size={20} color="#2B1E3D" />
            </button>
          </div>
          <p className="text-sm" style={{ color: "#2A2A28" }}>{user.name}</p>
          <p className="text-xs" style={{ color: "#888780" }}>{user.email}</p>
        </div>

        <div className="flex gap-2 px-4 pt-3">
          {[
            { id: "orders", label: "Orders" },
            { id: "addresses", label: "Addresses" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="text-xs font-medium px-3 py-1.5 rounded-full border"
              style={
                tab === t.id
                  ? { background: "#2B1E3D", color: "#FBF9F6", borderColor: "#2B1E3D" }
                  : { background: "transparent", color: "#2B1E3D", borderColor: "#B4B2A9" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 px-4 py-3">
          {tab === "orders" ? (
            loadingOrders ? (
              <p className="text-sm py-10 text-center" style={{ color: "#888780" }}>Loading your orders…</p>
            ) : orders.length === 0 ? (
              <p className="text-sm py-10 text-center" style={{ color: "#888780" }}>
                No orders yet — once you check out, they'll show up here.
              </p>
            ) : (
                            orders.map((o) => {
                const meta = STATUS_META[o.status] || STATUS_META.placed;
                const StatusIcon = meta.icon;
                return (
                  <div
                    key={o.id}
                    onClick={() => setSelectedOrder(o)}
                    className="mb-3 p-3 rounded-md border cursor-pointer hover:shadow-sm transition-shadow"
                    style={{ borderColor: "#E5E2D9", background: "#FFFFFF" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold" style={{ color: "#2A2A28" }}>Order #{o.orderNumber}</span>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm" style={{ background: "#F2A93B", color: "#2B1E3D" }}>
                        {formatPrice(o.subtotal)}
                      </span>
                    </div>
                    <p className="text-xs mb-2" style={{ color: "#888780" }}>
                      {o.items.reduce((s, i) => s + i.qty, 0)} item(s) · Placed {formatDate(o.createdAt)}
                    </p>
                    <div className="flex items-center gap-1.5 mb-1">
                      <StatusIcon size={14} color={meta.color} />
                      <span className="text-xs font-medium" style={{ color: meta.color }}>{meta.label}</span>
                    </div>
                    {o.status !== "delivered" && o.status !== "cancelled" && o.estimatedDelivery && (
                      <p className="text-xs" style={{ color: "#5F5E5A" }}>
                        Expected by <strong>{formatDate(o.estimatedDelivery)}</strong>
                      </p>
                    )}
                    <p className="text-xs mt-2" style={{ color: "#888780" }}>
                      Deliver to: {o.address?.line1}, {o.address?.city} {o.address?.pincode}
                    </p>
                  </div>
                );
              })
            )
          ) : (
            <>
              {(user.addresses || []).length === 0 && (
                <p className="text-sm py-6 text-center" style={{ color: "#888780" }}>No saved addresses yet.</p>
              )}
              {(user.addresses || []).map((addr) => (
                <div key={addr.id} className="flex items-start gap-2 p-3 mb-2 rounded-md border" style={{ borderColor: "#E5E2D9", background: "#FFFFFF" }}>
                  <div className="text-xs flex-1">
                    <p className="font-semibold" style={{ color: "#2A2A28" }}>{addr.label}</p>
                    <p style={{ color: "#5F5E5A" }}>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city} {addr.pincode}</p>
                    <p style={{ color: "#5F5E5A" }}>{addr.phone}</p>
                  </div>
                  <button onClick={() => deleteAddress(addr.id)} aria-label="Delete address">
                    <Trash2 size={15} color="#C23B3B" />
                  </button>
                </div>
              ))}
              {addingAddress ? (
                <AddressForm saving={savingAddress} onSave={saveNewAddress} onCancel={() => setAddingAddress(false)} />
              ) : (
                <button onClick={() => setAddingAddress(true)} className="w-full text-xs font-medium py-2.5 rounded-md border border-dashed" style={{ borderColor: "#B4B2A9", color: "#2B1E3D" }}>
                  + Add new address
                </button>
              )}
            </>
          )}
                </div>
      </div>

      {/* Order detail overlay */}
      {selectedOrder && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0" style={{ background: "rgba(43,30,61,0.5)" }} onClick={() => setSelectedOrder(null)} />
          <div className="relative w-full max-w-sm rounded-lg p-5 max-h-[80vh] overflow-y-auto" style={{ background: "#FBF9F6" }}>
            <button onClick={() => setSelectedOrder(null)} className="absolute top-4 right-4">
              <X size={18} color="#2B1E3D" />
            </button>

            <h3 style={{ fontFamily: "'Fraunces', serif", color: "#2B1E3D" }} className="text-lg font-semibold mb-1">
              Order #{selectedOrder.orderNumber}
            </h3>
                        <button
              onClick={() => onNeedHelp(selectedOrder.orderNumber)}
              className="text-xs font-medium underline mb-3"
              style={{ color: "#2B1E3D" }}
            >
              Need help with this order?
            </button>
            <p className="text-xs mb-4" style={{ color: "#888780" }}>
              Placed on {formatDate(selectedOrder.createdAt)}
            </p>

            {selectedOrder.trackingStage === "cancelled" ? (
              <p className="text-sm font-medium mb-4" style={{ color: "#C23B3B" }}>Order cancelled</p>
            ) : (
              <div className="flex items-center mb-4 mt-2">
                {TRACKING_STEPS.map((step, idx) => {
                  const currentIdx = TRACKING_STEPS.indexOf(selectedOrder.trackingStage);
                  const done = idx <= currentIdx;
                  const meta = STATUS_META[step];
                  const StepIcon = meta.icon;
                  return (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center gap-1" style={{ width: 60 }}>
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ background: done ? "#1F7A5C" : "#E5E2D9" }}
                        >
                          <StepIcon size={14} color={done ? "#FBF9F6" : "#888780"} />
                        </div>
                        <span className="text-[10px] text-center" style={{ color: done ? "#1F7A5C" : "#888780" }}>
                          {meta.label}
                        </span>
                      </div>
                      {idx < TRACKING_STEPS.length - 1 && (
                        <div className="flex-1 h-0.5" style={{ background: idx < currentIdx ? "#1F7A5C" : "#E5E2D9" }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
            {selectedOrder.status !== "delivered" && selectedOrder.status !== "cancelled" && selectedOrder.estimatedDelivery && (
              <p className="text-xs mb-4" style={{ color: "#5F5E5A" }}>
                Expected by <strong>{formatDate(selectedOrder.estimatedDelivery)}</strong>
              </p>
            )}

            <p className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: "#888780" }}>
              Items
            </p>
            {selectedOrder.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: "#E5E2D9" }}>
                <span className="text-sm" style={{ color: "#2A2A28" }}>{item.name} × {item.qty}</span>
                <span className="font-mono text-xs font-bold" style={{ color: "#2B1E3D" }}>{formatPrice(item.price * item.qty)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 mt-1">
              <span className="text-sm font-semibold" style={{ color: "#2A2A28" }}>Total</span>
              <span className="font-mono text-sm font-bold" style={{ color: "#2B1E3D" }}>{formatPrice(selectedOrder.subtotal)}</span>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: "#888780" }}>
              <p className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: "#888780" }}>
            Current location
            </p>
            <p className="text-sm" style={{ color: "#2A2A28" }}>
             {selectedOrder.currentLocation || "—"}
            </p>
              Delivery address
            </p>
            <p className="text-sm" style={{ color: "#2A2A28" }}>
              {selectedOrder.address?.line1}{selectedOrder.address?.line2 ? `, ${selectedOrder.address.line2}` : ""}
            </p>
            <p className="text-sm" style={{ color: "#2A2A28" }}>
              {selectedOrder.address?.city}, {selectedOrder.address?.state} {selectedOrder.address?.pincode}
            </p>
            <p className="text-sm" style={{ color: "#2A2A28" }}>{selectedOrder.address?.phone}</p>

            <p className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: "#888780" }}>
              Payment
            </p>
            <p className="text-sm" style={{ color: "#2A2A28" }}>
              {selectedOrder.paymentMethod?.type === "cod" && "Cash on delivery"}
              {selectedOrder.paymentMethod?.type === "card" && `Card ending in ${selectedOrder.paymentMethod.last4}`}
              {selectedOrder.paymentMethod?.type === "upi" && `UPI — ${selectedOrder.paymentMethod.vpa}`}
            </p>
                        {selectedOrder.trackingStage !== "delivered" && selectedOrder.trackingStage !== "cancelled" && (
              <button
                onClick={() => cancelOrder(selectedOrder.id)}
                className="w-full mt-4 py-2.5 rounded-md text-xs font-semibold border"
                style={{ borderColor: "#C23B3B", color: "#C23B3B" }}
              >
                Cancel this order
              </button>
            )}
            {selectedOrder.trackingStage === "delivered" && !selectedOrder.returnRequest && (
  <button
    onClick={() => { setReturnModalOpen(true); setReturnCategory("Wrong item received"); setReturnDetails(""); }}
    className="w-full mt-4 py-2.5 rounded-md text-xs font-semibold border"
    style={{ borderColor: "#2B1E3D", color: "#2B1E3D" }}
  >
    Request return
  </button>
)}
{selectedOrder.returnRequest && (
  <p className="text-xs mt-4 px-3 py-2 rounded-md" style={{ background: "#F1EFE8", color: "#5F5E5A" }}>
    Return request: <strong>{selectedOrder.returnRequest.status}</strong> — {selectedOrder.returnRequest.reason}
  </p>
)}
{selectedOrder.refundStatus && (
  <p className="text-xs mt-2 px-3 py-2 rounded-md" style={{ background: "#F1EFE8", color: "#5F5E5A" }}>
    Refund: <strong>
      {selectedOrder.refundStatus === "not_applicable" ? "Not applicable (Cash on delivery)" : selectedOrder.refundStatus}
    </strong>
  </p>
)}
{returnModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
    <div className="absolute inset-0" style={{ background: "rgba(43,30,61,0.5)" }} onClick={() => setReturnModalOpen(false)} />
    <div className="relative w-full max-w-sm rounded-lg p-5" style={{ background: "#FBF9F6" }}>
      <button onClick={() => setReturnModalOpen(false)} className="absolute top-4 right-4">
        <X size={18} color="#2B1E3D" />
      </button>
      <h3 style={{ fontFamily: "'Fraunces', serif", color: "#2B1E3D" }} className="text-lg font-semibold mb-4">
        Request a return
      </h3>

      <label className="block text-xs mb-3">
        <span className="block mb-1" style={{ color: "#5F5E5A" }}>Reason</span>
        <select
          value={returnCategory}
          onChange={(e) => setReturnCategory(e.target.value)}
          className="w-full text-sm px-3 py-2 rounded-md border outline-none"
          style={{ borderColor: "#B4B2A9", background: "#FFFFFF" }}
        >
          <option>Wrong item received</option>
          <option>Item damaged / defective</option>
          <option>Item not as described</option>
          <option>No longer needed</option>
          <option>Other</option>
        </select>
      </label>

      <label className="block text-xs mb-4">
        <span className="block mb-1" style={{ color: "#5F5E5A" }}>Additional details (optional)</span>
        <textarea
          value={returnDetails}
          onChange={(e) => setReturnDetails(e.target.value)}
          rows={3}
          placeholder="Tell us more about the issue…"
          className="w-full text-sm px-3 py-2 rounded-md border outline-none"
          style={{ borderColor: "#B4B2A9", background: "#FFFFFF" }}
        />
      </label>

      <button
        onClick={() => {
          const reason = returnDetails ? `${returnCategory} — ${returnDetails}` : returnCategory;
          setSubmittingReturn(true);
          fetch(`${API_BASE}/users/me/orders/${selectedOrder.id}/return`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ reason }),
          })
            .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
            .then(({ ok, data }) => {
              if (!ok) throw new Error(data.error || "Couldn't request return");
              setOrders((prev) => prev.map((o) => (o.id === data.order.id ? data.order : o)));
              setSelectedOrder(data.order);
              setReturnModalOpen(false);
            })
            .catch((err) => alert(err.message))
            .finally(() => setSubmittingReturn(false));
        }}
        disabled={submittingReturn}
        className="w-full py-2.5 rounded-md text-sm font-semibold disabled:opacity-60"
        style={{ background: "#2B1E3D", color: "#FBF9F6" }}
      >
        {submittingReturn ? "Submitting…" : "Submit return request"}
      </button>
    </div>
  </div>
)}
          </div>
        </div>
      )}
    </div>
  );
}
function SupportPanel({ user, prefillOrderNumber, onClose }) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [subject, setSubject] = useState(prefillOrderNumber ? `Help with order #${prefillOrderNumber}` : "");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const faqs = [
    { q: "How do I track my order?", a: "Open Order History, tap an order to see its live status and expected delivery date." },
    { q: "Can I change my delivery address after ordering?", a: "Not automatically — message us below with your order number and we'll update it manually." },
    { q: "What payment methods are accepted?", a: "Cash on delivery, card, and UPI. This is a demo store, so no real payment is charged." },
    { q: "How do I cancel an order?", a: "Message us below with your order number and we'll mark it cancelled." },
  ];

  const submit = (e) => {
    e.preventDefault();
    setError("");
    setSending(true);
    fetch(`${API_BASE}/support`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, subject, message, orderNumber: prefillOrderNumber || null }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "Couldn't send your message");
        setSent(true);
      })
      .catch((err) => setError(err.message))
      .finally(() => setSending(false));
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0" style={{ background: "rgba(43,30,61,0.4)" }} onClick={onClose} />
      <div className="relative w-full max-w-sm h-full flex flex-col overflow-y-auto" style={{ background: "#FBF9F6" }}>
        <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "#E5E2D9" }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", color: "#2B1E3D" }} className="text-lg font-semibold">
            Customer care
          </h2>
          <button onClick={onClose}><X size={20} color="#2B1E3D" /></button>
        </div>

        <div className="px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#888780" }}>Reach us directly</p>
          <div className="flex flex-col gap-2 mb-4">
            <a href="https://mail.google.com/mail/?view=cm&fs=1&to=kartlycustomercare@gmail.com" target="_blank" rel="noreferrer" className="text-sm" style={{ color: "#2B1E3D" }}>📧 kartlycustomercare@gmail.com</a>
            <a href="tel:+919991746521" className="text-sm" style={{ color: "#2B1E3D" }}>📞 +91 99917 46521</a>
            <a href="https://wa.me/919991746521" target="_blank" rel="noreferrer" className="text-sm" style={{ color: "#2B1E3D" }}>💬 Chat on WhatsApp</a>
          </div>

            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#888780" }}>Frequently asked</p>
          <div className="mb-5">
            {faqs.map((f, idx) => (
              <details key={idx} className="mb-1.5 text-sm" style={{ color: "#2A2A28" }}>
                <summary className="cursor-pointer font-medium py-1">{f.q}</summary>
                <p className="text-xs pl-1 pb-1" style={{ color: "#5F5E5A" }}>{f.a}</p>
              </details>
            ))}
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#888780" }}>Send us a message</p>
          {sent ? (
            <p className="text-sm px-3 py-3 rounded-md" style={{ background: "#EAF3EF", color: "#1F7A5C" }}>
              Thanks — we've got your message and will get back to you by email.
            </p>
          ) : (
            <form onSubmit={submit}>
              <TextInput label="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
              <TextInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <TextInput label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <label className="block text-xs mb-3">
                <span className="block mb-1" style={{ color: "#5F5E5A" }}>Message</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  className="w-full text-sm px-3 py-2 rounded-md border outline-none"
                  style={{ borderColor: "#B4B2A9", background: "#FFFFFF" }}
                />
              </label>
              {error && (
                <p className="text-xs mb-3 px-3 py-2 rounded-md" style={{ background: "#FBEAEA", color: "#C23B3B" }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={sending}
                className="w-full py-2.5 rounded-md text-sm font-semibold disabled:opacity-60"
                style={{ background: "#2B1E3D", color: "#FBF9F6" }}
              >
                {sending ? "Sending…" : "Send message"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
function WishlistPanel({ items, onRemove, onAddToCart, onClose }) {
  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <div className="absolute inset-0" style={{ background: "rgba(43,30,61,0.4)" }} onClick={onClose} />
      <div className="relative w-full max-w-sm h-full flex flex-col overflow-y-auto" style={{ background: "#FBF9F6" }}>
        <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "#E5E2D9" }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", color: "#2B1E3D" }} className="text-lg font-semibold">
            Wishlist
          </h2>
          <button onClick={onClose}><X size={20} color="#2B1E3D" /></button>
        </div>
        <div className="flex-1 px-4 py-2">
          {items.length === 0 ? (
            <p className="text-sm py-10 text-center" style={{ color: "#888780" }}>Nothing saved yet — tap the heart on any product.</p>
          ) : (
            items.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-3 border-b" style={{ borderColor: "#E5E2D9" }}>
                <img src={getProductImages(p.id)[0]} alt={p.name} className="w-14 h-14 rounded-md object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#2A2A28" }}>{p.name}</p>
                  <PriceTag price={p.price} />
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => onAddToCart(p.id)} className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ background: "#2B1E3D", color: "#FBF9F6" }}>
                      Add to cart
                    </button>
                    <button onClick={() => onRemove(p.id)} aria-label="Remove from wishlist">
                      <Trash2 size={15} color="#C23B3B" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
export default function App() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [order, setOrder] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);
const [detailQty, setDetailQty] = useState(1);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auth
  const [token, setToken] = useState(() => localStorage.getItem("kartly_token") || null);
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState("orders");
const [supportOpen, setSupportOpen] = useState(false);
const [supportOrderNumber, setSupportOrderNumber] = useState(null);
const [wishlist, setWishlist] = useState([]);
const [wishlistOpen, setWishlistOpen] = useState(false);
  // Checkout flow: 'cart' -> 'address' -> 'payment' -> done (order set)
  const [checkoutStep, setCheckoutStep] = useState("cart");
  const [addingAddress, setAddingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [guestAddress, setGuestAddress] = useState(null);
  const [paymentType, setPaymentType] = useState("cod");
  const [cardLast4, setCardLast4] = useState("");
  const [upiVpa, setUpiVpa] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [giftWrap, setGiftWrap] = useState(false);
const [deliveryDate, setDeliveryDate] = useState("");
const [deliveryTime, setDeliveryTime] = useState("Morning (9am–12pm)");
  const [checkoutError, setCheckoutError] = useState("");
const [couponCode, setCouponCode] = useState("");
const [couponDiscount, setCouponDiscount] = useState(0);
const [couponMsg, setCouponMsg] = useState("");
const [applyingCoupon, setApplyingCoupon] = useState(false);
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // ---- Session (guest cart identity) ----
  useEffect(() => {
    fetch(`${API_BASE}/session`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => setSessionId(data.sessionId))
      .catch(() => setOffline(true));
  }, []);

  // ---- Restore logged-in user from saved token ----
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setUser(data.user))
      .catch(() => {
        setToken(null);
        localStorage.removeItem("kartly_token");
      });
  }, [token]);

  const handleAuthed = (u, t) => {
    setUser(u);
    setToken(t);
    localStorage.setItem("kartly_token", t);
    setAuthModalOpen(false);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("kartly_token");
  };

  // ---- Products ----
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== "All") params.set("category", category);
    if (query) params.set("q", query);
    fetch(`${API_BASE}/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data);
        setOffline(false);
      })
      .catch(() => setOffline(true))
      .finally(() => setLoading(false));
  }, [category, query]);

  // ---- Cart ----
  const refreshCart = useCallback((sid) => {
    const id = sid || sessionId;
    if (!id) return;
    fetch(`${API_BASE}/cart/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCartItems(data.items || []);
        setSubtotal(data.subtotal || 0);
      })
      .catch(() => setOffline(true));
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) refreshCart(sessionId);
  }, [sessionId, refreshCart]);

  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);
useEffect(() => {
  if (!token) { setWishlist([]); return; }
  fetch(`${API_BASE}/users/me/wishlist`, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.json())
    .then((data) => setWishlist(data.items || []))
    .catch(() => setWishlist([]));
}, [token]);

const isWishlisted = (productId) => wishlist.some((p) => p.id === productId);

const toggleWishlist = (product) => {
  if (!token) { setAuthModalOpen(true); return; }
  if (isWishlisted(product.id)) {
    fetch(`${API_BASE}/users/me/wishlist/${product.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      .then(() => setWishlist((w) => w.filter((p) => p.id !== product.id)));
  } else {
    fetch(`${API_BASE}/users/me/wishlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId: product.id }),
    })
      .then(() => setWishlist((w) => [...w, product]));
  }
};
  const addToCart = (productId) => {
    if (!sessionId) return;
    fetch(`${API_BASE}/cart/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, qty: 1 }),
    })
      .then((r) => r.json())
      .then((data) => {
        setCartItems(data.items || []);
        setSubtotal(data.subtotal || 0);
      })
      .catch(() => setOffline(true));
  };

  const setQty = (productId, qty) => {
    if (!sessionId) return;
    fetch(`${API_BASE}/cart/${sessionId}/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty: Math.max(0, qty) }),
    })
      .then((r) => r.json())
      .then((data) => {
        setCartItems(data.items || []);
        setSubtotal(data.subtotal || 0);
      })
      .catch(() => setOffline(true));
  };

  const removeFromCart = (productId) => {
    if (!sessionId) return;
    fetch(`${API_BASE}/cart/${sessionId}/${productId}`, { method: "DELETE" })
      .then((r) => r.json())
      .then((data) => {
        setCartItems(data.items || []);
        setSubtotal(data.subtotal || 0);
      })
      .catch(() => setOffline(true));
  };

  // ---- Checkout flow ----
  const openCart = () => {
    setCartOpen(true);
    setCheckoutStep("cart");
    setCheckoutError("");
  };

  const goToAddressStep = () => {
    setSelectedAddressId(user?.addresses?.[0]?.id || null);
    setCheckoutStep("address");
  };

  const saveNewAddress = (form) => {
    setSavingAddress(true);
    fetch(`${API_BASE}/users/me/addresses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(form),
    })
      .then((r) => r.json())
      .then((data) => {
        setUser((u) => ({ ...u, addresses: data.addresses }));
        setSelectedAddressId(data.addresses[data.addresses.length - 1].id);
        setAddingAddress(false);
      })
      .catch(() => setCheckoutError("Couldn't save address — check the backend is running."))
      .finally(() => setSavingAddress(false));
  };

  const placeOrder = () => {
    setCheckoutError("");
    const address = user
      ? user.addresses.find((a) => a.id === selectedAddressId)
      : guestAddress;
    if (!address) {
      setCheckoutError("Please add a delivery address.");
      return;
    }
    let paymentMethod = { type: paymentType };
    if (paymentType === "card") paymentMethod.last4 = cardLast4.slice(-4) || "0000";
    if (paymentType === "upi") paymentMethod.vpa = upiVpa;

    setPlacingOrder(true);
    fetch(`${API_BASE}/checkout/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        address,
        paymentMethod,
        giftWrap,
        deliverySlot: deliveryDate ? { date: deliveryDate, time: deliveryTime } : null,
        couponCode: couponCode || null,
      }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "Couldn't place order");
        setOrder(data.order);
        setCartItems([]);
        setSubtotal(0);
      })
      .catch((err) => setCheckoutError(err.message))
      .finally(() => setPlacingOrder(false));
  };
const applyCoupon = () => {
  if (!couponCode) return;
  setApplyingCoupon(true);
  setCouponMsg("");
  fetch(`${API_BASE}/coupons/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: couponCode, subtotal }),
  })
    .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
    .then(({ ok, data }) => {
      if (!ok) throw new Error(data.error || "Invalid coupon");
      setCouponDiscount(data.discount);
      setCouponMsg(`"${data.code}" applied — you saved ${formatPrice(data.discount)}`);
    })
    .catch((err) => {
      setCouponDiscount(0);
      setCouponMsg(err.message);
    })
    .finally(() => setApplyingCoupon(false));
};
  const startOver = () => {
    setOrder(null);
    setCartOpen(false);
    setCheckoutStep("cart");
    setGuestAddress(null);
  };

  return (
    <div className="min-h-screen w-full font-sans" style={{ background: "#FBF9F6", color: "#2A2A28" }}>
      {offline && (
        <div className="flex items-center justify-center gap-2 text-xs py-2 px-4" style={{ background: "#C23B3B", color: "#FBF9F6" }}>
          <WifiOff size={13} />
          Can't reach the backend at {API_BASE.replace("/api", "")}. Make sure it's running (npm start).
        </div>
      )}

      {/* Nav */}
      <header className="sticky top-0 z-20" style={{ background: "#2B1E3D" }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <span className="text-xl tracking-tight" style={{ fontFamily: "'Fraunces', serif", color: "#FBF9F6", fontWeight: 600 }}>
            Kartly
          </span>
          <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-md px-3 py-2 max-w-xl">
            <Search size={16} color="#D3D1C7" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="bg-transparent outline-none text-sm w-full placeholder:text-[#D3D1C7]"
              style={{ color: "#FBF9F6" }}
            />
          </div>

                    {user ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setProfileOpen(true)}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-2 rounded-md hover:bg-white/10"
                style={{ color: "#FBF9F6" }}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={{ background: "#F2A93B", color: "#2B1E3D" }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
              </button>
              <button onClick={logout} className="p-2 rounded-md hover:bg-white/10" style={{ color: "#FBF9F6" }} aria-label="Log out">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md hover:bg-white/10"
              style={{ color: "#FBF9F6" }}
            >
              <User size={16} />
              Login
            </button>
          )}
                    {user && (
            <button
              onClick={() => { setProfileInitialTab("orders"); setProfileOpen(true); }}
              className="p-2 rounded-md hover:bg-white/10"
              style={{ color: "#FBF9F6" }}
              aria-label="Order history"
              title="Order history"
            >
              <Package size={20} />
            </button>
          )}
                    {user && (
            <button
              onClick={() => setWishlistOpen(true)}
              className="relative p-2 rounded-md hover:bg-white/10"
              style={{ color: "#FBF9F6" }}
              aria-label="Wishlist"
              title="Wishlist"
            >
              <Heart size={20} fill={wishlist.length > 0 ? "#F2A93B" : "none"} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center" style={{ background: "#F2A93B", color: "#2B1E3D" }}>
                  {wishlist.length}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => { setSupportOrderNumber(null); setSupportOpen(true); }}
            className="p-2 rounded-md hover:bg-white/10"
            style={{ color: "#FBF9F6" }}
            aria-label="Customer care"
            title="Customer care"
          >
            <Headphones size={20} />
          </button>
          <button onClick={openCart} className="relative flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10 transition-colors" style={{ color: "#FBF9F6" }}></button>
          <button onClick={openCart} className="relative flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10 transition-colors" style={{ color: "#FBF9F6" }}>
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center" style={{ background: "#F2A93B", color: "#2B1E3D" }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-6">
        <h1 style={{ fontFamily: "'Fraunces', serif", color: "#2B1E3D", fontWeight: 600 }} className="text-4xl sm:text-5xl leading-tight max-w-xl">
          Everything, sorted.
        </h1>
        <p className="mt-3 text-sm max-w-md" style={{ color: "#5F5E5A" }}>
          A tidy little marketplace — good goods, honest prices, no fuss.
        </p>
        <div className="flex flex-wrap gap-2 mt-6">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="text-sm px-3.5 py-1.5 rounded-full border transition-colors"
              style={category === c ? { background: "#2B1E3D", color: "#FBF9F6", borderColor: "#2B1E3D" } : { background: "transparent", color: "#2B1E3D", borderColor: "#B4B2A9" }}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Product grid */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        {loading ? (
          <p className="text-sm py-16 text-center" style={{ color: "#888780" }}>Loading products…</p>
        ) : products.length === 0 ? (
          <p className="text-sm py-16 text-center" style={{ color: "#888780" }}>
            {offline ? "Products will appear once the backend is reachable." : `No products match "${query}".`}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <div key={p.id} className="rounded-lg overflow-hidden border flex flex-col" style={{ borderColor: "#E5E2D9", background: "#FFFFFF" }}>
                <div
                  onClick={() => { setDetailProduct(p); setDetailQty(1); }}
                  className="aspect-square flex items-center justify-center relative cursor-pointer"
                  style={{ background: "#F1EFE8" }}
                >
                  <img src={getProductImages(p.id)[0]} alt={p.name} className="w-full h-full object-cover" />
                  {p.tag && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-sm" style={{ background: p.tag === "Sale" ? "#C23B3B" : "#1F7A5C", color: "#FBF9F6" }}>
                      {p.tag}
                    </span>
                  )}
                                    <button
                    onClick={(e) => { e.stopPropagation(); toggleWishlist(p); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.9)" }}
                  >
                    <Heart size={14} fill={isWishlisted(p.id) ? "#C23B3B" : "none"} stroke={isWishlisted(p.id) ? "#C23B3B" : "#2B1E3D"} />
                  </button>
                </div>
                <div className="p-3 flex flex-col gap-1.5 flex-1">
                  <span className="text-[11px] uppercase tracking-wide" style={{ color: "#888780" }}>{p.category}</span>
                  <h3
                    onClick={() => { setDetailProduct(p); setDetailQty(1); }}
                    className="text-sm font-medium leading-snug cursor-pointer hover:underline"
                    style={{ color: "#2A2A28" }}
                  >
                    {p.name}
                  </h3>
                  <Stars rating={p.rating} />
                  <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                    <PriceTag price={p.price} />
                    <button onClick={() => addToCart(p.id)} className="text-xs font-medium px-2.5 py-1.5 rounded-md transition-transform active:scale-95" style={{ background: "#2B1E3D", color: "#FBF9F6" }}>
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t py-6 text-center text-xs" style={{ borderColor: "#E5E2D9", color: "#888780" }}>
        Kartly — talking to the backend at {API_BASE.replace("/api", "")}
      </footer>
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          sessionId={sessionId}
          qty={detailQty}
          setQty={setDetailQty}
          onClose={() => setDetailProduct(null)}
          onAdded={(items, sub) => { setCartItems(items); setSubtotal(sub); }}
        />
      )}
      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} onAuthed={handleAuthed} />}
      {profileOpen && user && (
        <ProfilePanel
          user={user}
          token={token}
          initialTab={profileInitialTab}
          onClose={() => setProfileOpen(false)}
          onAddressesChanged={(addresses) => setUser((u) => ({ ...u, addresses }))}
          onNeedHelp={(orderNumber) => {
            setSupportOrderNumber(orderNumber);
            setSupportOpen(true);
          }}
        />
      )}

      {supportOpen && (
        <SupportPanel
          user={user}
          prefillOrderNumber={supportOrderNumber}
          onClose={() => setSupportOpen(false)}
        />
      )}
            {wishlistOpen && (
        <WishlistPanel
          items={wishlist}
          onRemove={(id) => {
            fetch(`${API_BASE}/users/me/wishlist/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
              .then(() => setWishlist((w) => w.filter((p) => p.id !== id)));
          }}
          onAddToCart={addToCart}
          onClose={() => setWishlistOpen(false)}
        />
      )}
      {/* Cart / checkout drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-30 flex justify-end">
          <div className="absolute inset-0" style={{ background: "rgba(43,30,61,0.4)" }} onClick={() => setCartOpen(false)} />
          <div className="relative w-full max-w-sm h-full flex flex-col overflow-y-auto" style={{ background: "#FBF9F6" }}>
            {order ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4 min-h-full">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#1F7A5C" }}>
                  <Check size={26} color="#FBF9F6" />
                </div>
                <h2 style={{ fontFamily: "'Fraunces', serif", color: "#2B1E3D" }} className="text-xl font-semibold">Order placed</h2>
                <p className="text-sm" style={{ color: "#5F5E5A" }}>
                  Order #{order.orderNumber} — {formatPrice(order.subtotal)} for {order.items.reduce((s, i) => s + i.qty, 0)} item(s).
                  <br />
                  Shipping to {order.address.line1}, {order.address.city}.
                  <br />
                  Payment: {order.paymentMethod.type.toUpperCase()}
                  {order.giftWrap && <><br />🎁 Gift wrapped</>}
                  {order.deliverySlot && <><br />📅 {order.deliverySlot.date} — {order.deliverySlot.time}</>}
                </p>
                <button onClick={startOver} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md mt-2" style={{ background: "#2B1E3D", color: "#FBF9F6" }}>
                  <ArrowLeft size={14} />
                  Continue shopping
                </button>
              </div>
            ) : checkoutStep === "cart" ? (
              <>
                <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "#E5E2D9" }}>
                  <h2 style={{ fontFamily: "'Fraunces', serif", color: "#2B1E3D" }} className="text-lg font-semibold">Your cart</h2>
                  <button onClick={() => setCartOpen(false)}><X size={20} color="#2B1E3D" /></button>
                </div>
                <div className="flex-1 px-4 py-2">
                  {cartItems.length === 0 ? (
                    <p className="text-sm py-10 text-center" style={{ color: "#888780" }}>Your cart is empty.</p>
                  ) : (
                    cartItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 py-3 border-b" style={{ borderColor: "#E5E2D9" }}>
                        <img src={getProductImages(item.id)[0]} alt={item.name} className="w-14 h-14 rounded-md object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "#2A2A28" }}>{item.name}</p>
                          <PriceTag price={item.price} />
                          <div className="flex items-center gap-2 mt-2">
                            <button onClick={() => setQty(item.id, item.qty - 1)} className="w-6 h-6 flex items-center justify-center rounded-full border" style={{ borderColor: "#B4B2A9" }}><Minus size={12} /></button>
                            <span className="text-sm w-4 text-center">{item.qty}</span>
                            <button onClick={() => setQty(item.id, item.qty + 1)} className="w-6 h-6 flex items-center justify-center rounded-full border" style={{ borderColor: "#B4B2A9" }}><Plus size={12} /></button>
                            <button onClick={() => removeFromCart(item.id)} className="ml-auto" aria-label="Remove item"><Trash2 size={15} color="#C23B3B" /></button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {cartItems.length > 0 && (
                  <div className="px-4 py-4 border-t" style={{ borderColor: "#E5E2D9" }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm" style={{ color: "#5F5E5A" }}>Subtotal</span>
                      <span className="font-mono text-base font-bold" style={{ color: "#2B1E3D" }}>{formatPrice(subtotal)}</span>
                    </div>
                    <button onClick={goToAddressStep} className="w-full py-3 rounded-md text-sm font-semibold transition-transform active:scale-[0.98]" style={{ background: "#F2A93B", color: "#2B1E3D" }}>
                      Checkout
                    </button>
                  </div>
                )}
              </>
            ) : checkoutStep === "address" ? (
              <>
                <div className="flex items-center gap-2 px-4 py-4 border-b" style={{ borderColor: "#E5E2D9" }}>
                  <button onClick={() => setCheckoutStep("cart")}><ArrowLeft size={18} color="#2B1E3D" /></button>
                  <h2 style={{ fontFamily: "'Fraunces', serif", color: "#2B1E3D" }} className="text-lg font-semibold flex items-center gap-2">
                    <MapPin size={17} /> Delivery address
                  </h2>
                </div>
                <div className="flex-1 px-4 py-3">
                  {!user ? (
                    <>
                      <p className="text-xs mb-3" style={{ color: "#888780" }}>
                        Checking out as a guest. <button className="underline font-medium" style={{ color: "#2B1E3D" }} onClick={() => setAuthModalOpen(true)}>Log in</button> to save this address for next time.
                      </p>
                      <AddressForm initial={guestAddress} onSave={(form) => { setGuestAddress(form); setCheckoutStep("payment"); }} />
                    </>
                  ) : (
                    <>
                      {(user.addresses || []).map((addr) => (
                        <label key={addr.id} className="flex items-start gap-2 p-3 mb-2 rounded-md border cursor-pointer" style={{ borderColor: selectedAddressId === addr.id ? "#2B1E3D" : "#E5E2D9" }}>
                          <input type="radio" checked={selectedAddressId === addr.id} onChange={() => setSelectedAddressId(addr.id)} className="mt-1" />
                          <div className="text-xs">
                            <p className="font-semibold" style={{ color: "#2A2A28" }}>{addr.label}</p>
                            <p style={{ color: "#5F5E5A" }}>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city} {addr.pincode}</p>
                            <p style={{ color: "#5F5E5A" }}>{addr.phone}</p>
                          </div>
                        </label>
                      ))}

                      {addingAddress ? (
                        <AddressForm saving={savingAddress} onSave={saveNewAddress} onCancel={() => setAddingAddress(false)} />
                      ) : (
                        <button onClick={() => setAddingAddress(true)} className="w-full text-xs font-medium py-2.5 rounded-md border border-dashed" style={{ borderColor: "#B4B2A9", color: "#2B1E3D" }}>
                          + Add new address
                        </button>
                      )}
                    </>
                  )}
                </div>
                {user && (
                  <div className="px-4 py-4 border-t" style={{ borderColor: "#E5E2D9" }}>
                    <button
                      onClick={() => setCheckoutStep("payment")}
                      disabled={!selectedAddressId}
                      className="w-full py-3 rounded-md text-sm font-semibold disabled:opacity-50"
                      style={{ background: "#F2A93B", color: "#2B1E3D" }}
                    >
                      Continue to payment
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 px-4 py-4 border-b" style={{ borderColor: "#E5E2D9" }}>
                  <button onClick={() => setCheckoutStep("address")}><ArrowLeft size={18} color="#2B1E3D" /></button>
                  <h2 style={{ fontFamily: "'Fraunces', serif", color: "#2B1E3D" }} className="text-lg font-semibold flex items-center gap-2">
                    <CreditCard size={17} /> Payment
                  </h2>
                </div>
                <div className="flex-1 px-4 py-3">
                  <p className="text-[11px] mb-3 px-3 py-2 rounded-md" style={{ background: "#F1EFE8", color: "#888780" }}>
                    Demo checkout — no real payment is processed, nothing is charged.
                  </p>
                                    <div className="mb-4 p-3 rounded-md border" style={{ borderColor: "#E5E2D9" }}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#888780" }}>
                      Delivery date &amp; time (optional)
                    </p>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full text-sm px-3 py-2 rounded-md border outline-none mb-2"
                      style={{ borderColor: "#B4B2A9" }}
                    />
                    <select
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      className="w-full text-sm px-3 py-2 rounded-md border outline-none"
                      style={{ borderColor: "#B4B2A9" }}
                    >
                      <option>Morning (9am–12pm)</option>
                      <option>Afternoon (12pm–4pm)</option>
                      <option>Evening (4pm–8pm)</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 mb-4 text-sm cursor-pointer">
                    <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} />
                    Gift wrap this order (+₹30)
                  </label>
                                    <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#888780" }}>
                      Coupon code
                    </p>
                    <div className="flex gap-2">
                      <input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="e.g. WELCOME10"
                        className="flex-1 text-sm px-3 py-2 rounded-md border outline-none"
                        style={{ borderColor: "#B4B2A9" }}
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={applyingCoupon || !couponCode}
                        className="text-xs font-semibold px-3 py-2 rounded-md disabled:opacity-50"
                        style={{ background: "#2B1E3D", color: "#FBF9F6" }}
                      >
                        {applyingCoupon ? "…" : "Apply"}
                      </button>
                    </div>
                    {couponMsg && (
                      <p className="text-xs mt-1" style={{ color: couponDiscount > 0 ? "#1F7A5C" : "#C23B3B" }}>
                        {couponMsg}
                      </p>
                    )}
                  </div>
                  {[
                    { id: "cod", label: "Cash on delivery" },
                    { id: "card", label: "Credit / debit card" },
                    { id: "upi", label: "UPI" },
                  ].map((opt) => (
                    <label key={opt.id} className="flex items-center gap-2 p-3 mb-2 rounded-md border cursor-pointer" style={{ borderColor: paymentType === opt.id ? "#2B1E3D" : "#E5E2D9" }}>
                      <input type="radio" checked={paymentType === opt.id} onChange={() => setPaymentType(opt.id)} />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                  {paymentType === "card" && (
                    <TextInput label="Card number (any digits — demo only)" value={cardLast4} onChange={(e) => setCardLast4(e.target.value)} placeholder="4242 4242 4242 4242" />
                  )}
                  {paymentType === "upi" && (
                    <TextInput label="UPI ID" value={upiVpa} onChange={(e) => setUpiVpa(e.target.value)} placeholder="yourname@bank" />
                  )}
                  {checkoutError && (
                    <p className="text-xs mt-2 px-3 py-2 rounded-md" style={{ background: "#FBEAEA", color: "#C23B3B" }}>{checkoutError}</p>
                  )}
                </div>
                <div className="px-4 py-4 border-t" style={{ borderColor: "#E5E2D9" }}>
                  {giftWrap && (
                    <div className="flex items-center justify-between mb-1 text-xs" style={{ color: "#5F5E5A" }}>
                      <span>Gift wrap</span>
                      <span>{formatPrice(30)}</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex items-center justify-between mb-1 text-xs" style={{ color: "#1F7A5C" }}>
                      <span>Coupon discount</span>
                      <span>−{formatPrice(couponDiscount)}</span>
                    </div>
                  )}
                  {paymentType === "card" && (
                    <div className="flex items-center justify-between mb-1 text-xs" style={{ color: "#1F7A5C" }}>
                      <span>Card payment discount (5%)</span>
                      <span>−{formatPrice(Math.round(subtotal * 0.05))}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm" style={{ color: "#5F5E5A" }}>Total</span>
                    <span className="font-mono text-base font-bold" style={{ color: "#2B1E3D" }}>
                      {formatPrice(Math.max(0, subtotal + (giftWrap ? 30 : 0) - couponDiscount - (paymentType === "card" ? Math.round(subtotal * 0.05) : 0)))}
                    </span>
                  </div>
                  <button onClick={placeOrder} disabled={placingOrder} className="w-full py-3 rounded-md text-sm font-semibold disabled:opacity-60" style={{ background: "#F2A93B", color: "#2B1E3D" }}>
                    {placingOrder ? "Placing order…" : "Place order"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
