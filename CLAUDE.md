# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow

After each meaningful unit of work, automatically commit and push the changes. No need to ask for confirmation before committing or pushing.

## Product Overview

MrBar is a two-sided promotions, raffles, and notifications platform for physical venues (bars, clubs, restaurants). Businesses launch real-time campaigns (e.g. "buy a Heineken in the next 15 min, enter a raffle for 20 free shots"), customers receive push notifications, scan a QR/enter a code at the POS, and are entered into the raffle or receive an instant reward.

## Architecture

Three separate apps share a common backend:

| App | Tech | Purpose |
|-----|------|---------|
| `backend` | Node.js + NestJS | REST API, business logic, queues |
| `customer-app` | Flutter | iOS + Android customer app |
| `business-panel` | Next.js | Web dashboard for business owners/staff |

### Backend Services (NestJS modules)
`auth` · `users` · `businesses` · `branches` · `employees` · `campaigns` · `entries` · `rewards` · `redemptions` · `notifications` · `analytics` · `billing` · `fraud` · `admin`

### Infrastructure
- **Database:** PostgreSQL
- **Cache / queues:** Redis + BullMQ
- **Push notifications:** Firebase (FCM) + APNS
- **File storage:** S3 / Cloudinary
- **Maps:** Google Maps / Mapbox
- **Monitoring:** Sentry + Grafana + PostHog

### Key Domain Concepts
- **Campaign** – time-boxed promotion with eligibility rules, required product, reward, and a win mechanism (raffle / instant / every-N / weighted odds).
- **Entry** – a participation event created when a customer scans a dynamic QR or submits a purchase code. Includes duplicate-prevention (hash + TTL + device fingerprint).
- **Reward / UserReward** – prize allocated to a winner; has inventory cap, expiry window, and a one-time redemption QR.
- **Redemption** – staff-side action that marks a UserReward as used; validated by branch and short-lived code.

### Auth & Permissions
- JWT access + refresh tokens, OTP via SMS, Google/Apple social login.
- RBAC roles: `customer` | `owner` | `manager` | `bartender` | `cashier` | `hostess` | `admin`.

## Commands

### Local infrastructure (PostgreSQL + Redis)
```bash
docker-compose up -d
```

### Backend (NestJS)
```bash
cd backend
npm run start:dev          # dev server with watch
npm run build              # production build
npm test                   # unit tests
npm test -- --testPathPattern=<name>  # single test file
npx prisma generate        # regenerate Prisma client after schema changes
npx prisma migrate dev     # create and apply a new migration
```
Swagger UI: http://localhost:3000/api/docs

### Business Panel (Next.js) — not yet scaffolded
```bash
cd business-panel
npm run dev
```

### Customer App (Flutter) — not yet scaffolded
```bash
cd customer-app
flutter run
```

### Node.js PATH note
Node is installed via Homebrew. If `node`/`npm` are not found, run:
```bash
export PATH="/opt/homebrew/bin:$PATH"
```
