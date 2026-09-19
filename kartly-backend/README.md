# Kartly backend

An Express API for the Kartly demo shopping app — products, cart, checkout,
user accounts (email/password + Google sign-in), delivery addresses, and an
admin API to manage everything.

Storage is simple JSON files in `data/` — no database setup needed.

## Setup

```bash
npm install
```

A `.env` file is already included with working defaults for local testing
(random `JWT_SECRET` and `ADMIN_KEY` were generated for you). **Change these
before using this for anything real.** See `.env.example` for what each one
does.

## Run it

```bash
npm start
```

Server runs at `http://localhost:4000`.

## What's new in this version

### User accounts
- `POST /api/auth/register` — `{ name, email, password }` → creates an account, returns a token
- `POST /api/auth/login` — `{ email, password }` → returns a token
- `GET /api/auth/me` — returns the logged-in user (send `Authorization: Bearer <token>`)

### Google sign-in
- `POST /api/auth/google` — `{ idToken }` → verifies the token and logs the user in

This needs your own Google OAuth credentials — Claude can't create these for
you since they're tied to your own Google account:
1. Go to https://console.cloud.google.com/apis/credentials
2. Create an **OAuth 2.0 Client ID** of type "Web application"
3. Add your frontend's URL (e.g. `http://localhost:5173`) under "Authorized JavaScript origins"
4. Copy the Client ID into `.env` as `GOOGLE_CLIENT_ID`
5. On the frontend, use Google's "Sign In With Google" button/library to get an `idToken`, then send it to `/api/auth/google`

### Delivery addresses (requires login — send the Bearer token)
- `GET /api/users/me/addresses`
- `POST /api/users/me/addresses` — `{ label, line1, line2, city, state, pincode, phone }`
- `PUT /api/users/me/addresses/:addressId`
- `DELETE /api/users/me/addresses/:addressId`

### Checkout with address + payment
`POST /api/checkout/:sessionId` now requires:
```json
{
  "address": { "line1": "...", "city": "...", "pincode": "...", "phone": "..." },
  "paymentMethod": { "type": "cod" }   // or { "type": "card", "last4": "4242" } or { "type": "upi", "vpa": "name@bank" }
}
```
This **does not charge a real card** — no payment gateway is connected. It
just records what the shopper chose, same as any store does before actually
processing payment. To take real payments, integrate a gateway like Razorpay
or Stripe using their own SDKs and API keys.

### Admin — view and manage everything
All admin routes require a header: `x-admin-key: <your ADMIN_KEY from .env>`

| Method | Path | What it does |
|---|---|---|
| GET | /api/admin/products | List all products |
| POST | /api/admin/products | Add a product — `{ name, category, price, rating, tag }` |
| PUT | /api/admin/products/:id | Edit a product |
| DELETE | /api/admin/products/:id | Delete a product |
| GET | /api/admin/orders | List all orders |
| PUT | /api/admin/orders/:id/status | Update order status — `{ status: "shipped" }` etc. |
| GET | /api/admin/users | List all users (no passwords included) |

Easiest way to try these without writing code: use a tool like **Postman** or
**Insomnia**, or `curl`:
```bash
curl http://localhost:4000/api/admin/orders -H "x-admin-key: YOUR_ADMIN_KEY"
```
(Your actual key is in the `.env` file.)

You can also just open the files in `data/` directly to see everything —
`products.json`, `orders.json`, `users.json`.

## All endpoints

| Method | Path | Auth | What it does |
|---|---|---|---|
| GET | /api/health | — | Health check |
| GET | /api/products | — | List products (`?category=`, `?q=`) |
| GET | /api/products/:id | — | Get one product |
| POST | /api/auth/register | — | Create account |
| POST | /api/auth/login | — | Log in |
| POST | /api/auth/google | — | Log in with Google |
| GET | /api/auth/me | user | Current user |
| GET/POST | /api/users/me/addresses | user | List / add addresses |
| PUT/DELETE | /api/users/me/addresses/:id | user | Edit / remove address |
| GET/POST | /api/cart/:sessionId | — | Get / add to cart |
| PUT/DELETE | /api/cart/:sessionId/:productId | — | Update / remove cart item |
| POST | /api/checkout/:sessionId | — | Place order (needs address + paymentMethod) |
| GET | /api/orders/:sessionId | — | Orders for a guest session |
| GET | /api/users/me/orders | user | All orders for the logged-in user |
| GET/POST/PUT/DELETE | /api/admin/products | admin | Manage products |
| GET | /api/admin/orders | admin | View all orders |
| PUT | /api/admin/orders/:id/status | admin | Update order status |
| GET | /api/admin/users | admin | View all users |

## Deploying it for real

- Push this folder to a GitHub repo.
- Deploy on **Render**, **Railway**, or **Fly.io** (free tiers support plain
  Node/Express apps).
- Set the environment variables (`JWT_SECRET`, `ADMIN_KEY`, `GOOGLE_CLIENT_ID`)
  in that platform's dashboard — don't commit your real `.env` file to GitHub.
- Update the frontend's `API_BASE` to the deployed URL.

## Notes

- Carts are in-memory (reset on server restart); users/orders/products persist
  to JSON files. Swap in a real database (Postgres, MongoDB) for production use.
- Passwords are hashed with bcrypt — never stored in plain text.
- This is a demo-grade auth system: good for learning and small projects, not
  audited for production security.
