# Spotty Zebras

A Progressive Web App (PWA) for managing events, bookings, support directories, and donations for non-governmental organisations. Built with Next.js, Supabase, and Stripe.

## Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Database & Auth:** Supabase (PostgreSQL with Row Level Security)
- **Payments:** Stripe
- **PWA:** next-pwa
- **Hosting:** Vercel

## Prerequisites

- [Node.js 18+](https://nodejs.org)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/Scottish-Tech-Army/SpottyZebras.git
cd spotty-zebras
npm install
```

### 2. Configure environment variables

Ask a team member for the Supabase credentials, then create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Do not commit this file — it is already in `.gitignore`.

### 3. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see Supabase marked as connected.

## Project Structure

```
app/
├── api/health/        # Health check endpoint
├── layout.tsx         # Root layout
└── page.tsx           # Homepage
lib/
└── supabase.ts        # Supabase client
types/
└── index.ts           # Shared TypeScript types
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run lint` | Lint code |

## Troubleshooting

**Supabase not connecting** — Check that `.env.local` exists in the project root, values are correct, and you have restarted the dev server after editing it.


**Port 3000 in use** — Run `npm run dev -- -p 3001` and open [http://localhost:3001](http://localhost:3001).
