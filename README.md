# Dairy Management – Next.js App

A Next.js (App Router) frontend for the Dairy Management system. Uses Firebase (Auth + Firestore), shadcn/ui, Tailwind CSS v3, and date-fns.

## Features
- Admin-only app with Firebase Authentication
- Clients CRUD and daily Deliveries entry (0–5L in 0.25 steps)
- Price history with mid-month changes
- Monthly/Custom calculations with PDF export
- Delivery History with month filter and search
- Offline-ready Firestore (IndexedDB persistence)
- Light, cool theme using shadcn/ui and Tailwind v3

## Tech Stack
- Next.js 14 App Router (TypeScript)
- Firebase (Auth, Firestore modular SDK)
- shadcn/ui + Tailwind CSS v3
- date-fns, lucide-react
- jspdf + jspdf-autotable (PDF export)

## Getting Started

1) Install dependencies (from repository root or this folder):

```bash
npm install
```

2) Configure Firebase

Create a `.env.local` in this folder if desired, or update `lib/firebase.ts` with your config. Current config is already set for the provided project.

3) Run the dev server

```bash
npm run dev
```

The app runs at `http://localhost:3000` if started via Next.js, or `http://localhost:5173` for the Vite app in the root. This Next.js app lives in `nextjs-app/` and uses its own dev server.

## Scripts
- `npm run dev` – Start Next.js dev server
- `npm run build` – Build for production
- `npm run start` – Start production server

## Project Structure (Next.js)
```
nextjs-app/
├─ app/
│  ├─ page.tsx                # Dashboard
│  ├─ clients/page.tsx        # Clients management
│  ├─ deliveries/page.tsx     # Daily deliveries
│  ├─ prices/page.tsx         # Price history & set new price
│  ├─ calculations/page.tsx   # Monthly statements & PDF
│  ├─ history/page.tsx        # All deliveries history
│  ├─ login/page.tsx          # Login
│  ├─ signup/page.tsx         # Signup
│  ├─ layout.tsx              # Root layout
│  └─ globals.css             # Global styles
├─ components/
│  ├─ Layout.tsx              # Header + nav
│  ├─ AuthProvider.tsx        # Client-side route guard
│  ├─ ErrorBoundary.tsx
│  └─ ui/*                    # shadcn/ui components
├─ hooks/
│  ├─ useAuth.ts
│  ├─ useFirestore.ts         # Caching + realtime wrapper
│  └─ use-toast.ts
├─ lib/
│  ├─ firebase.ts             # Firebase init
│  └─ utils.ts                # cn(), toDate()
├─ types/
│  └─ index.ts                # Client, Price, Delivery types
├─ tailwind.config.ts
├─ postcss.config.js
├─ tsconfig.json
└─ README.md
```

## Tailwind & shadcn
- Tailwind v3 configured in `tailwind.config.ts` and `postcss.config.js`
- Global theme tokens in `app/globals.css`
- All shadcn/ui components live in `components/ui/*`

## Notes & Troubleshooting
- Use client-side auth (see `components/AuthProvider.tsx`).
- Date handling: always convert Firestore Timestamps using `toDate()`.
- To avoid Firestore composite index requirements, heavy sorts are done client-side where acceptable.
- If you update clients or prices and don’t see changes immediately, clear session cache keys (e.g., `clients_list`, `milk_prices`) or refresh.

## Deployment
- Any Next.js-compatible host (Vercel recommended). Ensure Firebase web credentials are configured in env or `lib/firebase.ts`.
