# Arka Frontend

Arka Frontend adalah aplikasi React/Vite untuk pengasuh institusi. Aplikasi ini menyediakan landing page, autentikasi, onboarding, dashboard, kesiapan perangkat, pemilihan mode latihan, dan tampilan hasil/aktivitas yang dikirim backend.

Browser tidak terhubung langsung ke PostgreSQL, Redis, Ollama, atau ESP32. Request HTTP dan WebSocket diarahkan ke Arka Backend.

## Technology Stack

| Area | Teknologi |
| --- | --- |
| Framework | React 19, Vite 8, TypeScript |
| Routing | React Router 7 |
| Data fetching | TanStack Query |
| Styling | Tailwind CSS 4 |
| Validation | Zod |
| Motion | Framer Motion dengan dukungan reduced motion |
| Icons | Lucide React |

## Features

- Landing, mission, FAQ, dan contact pages
- Login, register, session restoration, dan Google OAuth ketika provider tersedia
- Institution onboarding
- Dashboard kesiapan device dan aktivitas permainan
- Tiga kartu mode: Peras Jeruk, Tangkap Wayang, dan Ding Dong Dong
- Resolusi peserta serta leaderboard privat berdasarkan mode dan versi aturan
- Route constants dan client hooks untuk participant, device, preparation, session, result, history, dan realtime flow
- Fokus route, keyboard navigation, label form, ukuran kontrol besar, dan reduced-motion support

## Routes

| Path | Access | Keterangan |
| --- | --- | --- |
| `/` | Public | Landing page |
| `/login` | Public | Login institusi |
| `/register` | Public | Registrasi institusi |
| `/onboarding` | Authenticated | Setup institusi setelah autentikasi |
| `/dashboard` | Authenticated | Pilihan mode, device readiness, aktivitas, dan leaderboard privat |
| `/mission` | Public | Misi produk |
| `/faq` | Public | Pertanyaan umum |
| `/contact` | Public | Kontak |

Route constants untuk participant, device, tutorial, setup, session, result, dan history sudah disiapkan di `src/constants/routes.ts`; halaman yang belum terpasang tidak dianggap sebagai alur MVP yang aktif.

## Environment Variables

Buat `.env` dari `.env.example`:

```env
VITE_BACKEND_URL=http://localhost:4001
```

| Variable | Keterangan |
| --- | --- |
| `VITE_BACKEND_URL` | Origin backend untuk proxy REST dan WebSocket saat development |

Nilai `VITE_*` bersifat publik. Secret database, Better Auth, device, Redis, Ollama, dan operations webhook hanya boleh berada di backend.

## Getting Started

### Prerequisites

- Node.js dan npm
- Arka Backend berjalan pada `VITE_BACKEND_URL`

### Installation

```bash
npm ci
```

### Development

```bash
npm run dev
```

Vite memakai port `5174` dan mem-proxy `/api` serta `/ws/app` ke backend.

### Quality Checks

```bash
npm run typecheck
npm run build
```

## Project Structure

```text
src/
|-- api/          # REST client berdasarkan domain
|-- assets/       # Ilustrasi, emoji, audio, dan aset visual
|-- components/   # Shell, account menu, field, button, dan UI bersama
|-- config/       # API client dan konfigurasi browser
|-- constants/    # Route, API path, query key, dan nilai domain
|-- hooks/        # Auth, dashboard, participant, device, game, dan realtime hooks
|-- lib/          # Client WebSocket dan utility browser
|-- pages/        # Halaman berdasarkan route
|-- schemas/      # Kontrak Zod browser/realtime
`-- app.tsx       # Route registration dan lazy loading
```

## Backend Contract

Frontend hanya merender DTO, snapshot, dan event yang disahkan backend. Frontend tidak boleh menjadi sumber kebenaran untuk timer, scoring, participant identity, session finalization, atau device command. Perubahan kontrak harus disinkronkan dengan Arka Backend di direktori `Arka-BE` dan dokumentasi `docs/browser-api.md`.
