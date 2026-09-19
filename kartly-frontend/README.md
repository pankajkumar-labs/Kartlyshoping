# Kartly frontend

The Kartly shopping app UI — browsing, cart, login/signup (email or Google),
saved delivery addresses, and payment method selection at checkout — all
talking to the Kartly backend over its REST API.

This needs to run as a normal local webpage (not inside Claude's artifact
preview) so it can reach `http://localhost:4000` in your own browser.

## Before you start

Make sure **kartly-backend** is already running in a separate terminal
(`npm start` inside that folder) — this app won't show any products otherwise.

## Run it

```bash
npm install
npm run dev
```

Open the URL it prints — usually `http://localhost:5173`.

## What's new in this version

- **Login / Sign up** — top-right "Login" button opens a modal with email+password
  register/login.
- **Google sign-in** — appears in the same modal, but only works once you've set
  `VITE_GOOGLE_CLIENT_ID` in a `.env` file here (copy `.env.example`), matching
  the `GOOGLE_CLIENT_ID` in the backend's `.env`. Without it, the modal shows a
  note instead of a broken button.
- **Checkout flow** — cart → delivery address → payment method → order placed.
  Logged-in users can save multiple addresses and pick one; guests fill in a
  one-time address. Payment options are Cash on Delivery, Card, or UPI — this
  is a demo, so **no real payment is processed**.

## Changing the backend address

Edit the `API_BASE` constant near the top of `src/App.jsx` if your backend
runs somewhere other than `http://localhost:4000`.

## Building for deployment

```bash
npm run build
```

Produces a `dist/` folder of static files you can deploy anywhere (Vercel,
Netlify, GitHub Pages, etc.) — set `API_BASE` and `VITE_GOOGLE_CLIENT_ID` to
your deployed values before building.
