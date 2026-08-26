# Counterpoint

A retail point-of-sale and inventory app built with React and Vite — white background, an
Opay-inspired green primary color, and a distinct editorial/mono type system instead of a generic
SaaS template look.

> "Counterpoint" is a placeholder brand name. Swap it out in `src/components/Logo.jsx`,
> `index.html` and `README.md` whenever the real name is ready.

## What's included

- Role-based clock-in (PIN) for Sales Representative, Supervisor, Manager and Store Admin, each
with its own permissions (max discount, void rights, inventory access).
- A fast checkout flow: category quick-filters, guided discount presets, cart, payment method, and
a clear post-sale receipt confirmation.
- Inventory controls with low-stock alerts, surfaced live via a badge on the Inventory tab.
- Safer sale voids that require a confirmation step.
- Reports: revenue, transaction counts, permission summary, recent activity and recent sales.
- **Store Admin panel**: view all staff, add new staff, promote (change role), block/unblock, and deactivate/reactivate — only visible after a Store Admin clocks in.
- **PWA & Offline-ready**: Installable as a native standalone desktop or tablet app. Sales, stock and staff data save on the device first, so a network drop cannot interrupt checkout. Open carts and held sales survive a refresh. When a remote API is configured later, offline mutations queue and sync when the connection returns.



## Signing in (seed data)

Staff sign in with their **name** and **PIN** — there's no clickable staff list on screen, since
that would expose who works at the store and what each role is allowed to do to anyone standing at
the till. For local testing, the seeded accounts in `src/data/seed.json` are:


| Name         | Role        | PIN                  |      |
| ------------ | ----------- | -------------------- | ---- |
| Ada Okafor   |             | Sales Representative | 1111 |
| Bola Adebayo | Supervisor  | 2222                 |      |
| Grace Nwosu  | Manager     | 9999                 |      |
| Kemi Yusuf   | Store Admin | 4444                 |      |


Replace these with real staff records (and unique PINs) before handing the app to a store.

## Data layer (important for going to production)

This app ships with **no backend yet**. All data (products, employees, sales, activity log) is
defined in [src/data/seed.json](src/data/seed.json) and persisted to the browser's `localStorage`
via [src/services/store.js](src/services/store.js) — every function in that file returns a
Promise and is called the same way a real API call would be.

To connect it to your real backend once it's ready:

1. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to your API's base URL.
2. That's it — `src/services/store.js` already branches on that variable and calls
  `fetch(base + '/products')`, `fetch(base + '/sales', { method: 'POST', ... })`, etc. Point those
   paths at your actual routes (or adjust the small `request()` helper) and remove the local
   `localStorage` branch once you trust the new endpoints.

No component ever touches `localStorage` or `fetch` directly — they all go through
`src/hooks/useAppData.js`, which calls the service layer. That's the only file boundary you need to
respect when the backend lands.

## Run locally

```
npm install
npm run dev
```



## Build for production

```
npm run build
```



## Tests

```
npm run test
```

