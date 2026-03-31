# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
קובץ זה מספק הנחיות ל-Claude Code בעת עבודה עם הקוד במאגר זה.

---

## Git Workflow / זרימת עבודה עם Git

After each meaningful unit of work, automatically commit AND push to origin main. No need to ask for confirmation before committing or pushing.

לאחר כל יחידת עבודה משמעותית, בצע commit ו-push אוטומטי ל-origin main. אין צורך לבקש אישור לפני commit או push.

---

## Change Policy / מדיניות שינויים

When asked to make any change, always search for every place in the codebase that is affected — backend, business panel, Flutter app, DTOs, translations, tests — and apply the change everywhere. Never fix only one layer. A change to a feature must be complete across the full stack.

כאשר מתבקש לבצע שינוי כלשהו, יש לחפש בכל מקום בקוד שמושפע מהשינוי — backend, לוח הניהול, אפליקציית Flutter, DTOs, תרגומים, טסטים — ולהחיל את השינוי בכל מקום. אין לתקן שכבה אחת בלבד. שינוי בפיצ'ר חייב להיות שלם על פני כל ה-stack.

---

## Billing & Plan Consistency / עקביות חיוב ותוכניות

Every change to the business panel that adds, removes, or modifies a feature **must** be correlated with the billing plan definitions. Specifically:

1. **If a feature is new or changes scope** — decide which plan tier it belongs to and update:
   - `PLAN_LIMITS` in `backend/src/billing/billing.service.ts` (add the relevant flag/limit)
   - Backend enforcement guards (e.g. `assertBusinessEmployee`, `enforcePlanLimits`, or a new check in the relevant service)
   - The `PLANS` feature list in `business-panel/src/app/(dashboard)/billing/page.tsx` (add it to the correct plan's `features` or `locked` arrays)
   - The `PLAN_FEATURES` list in `business-panel/src/components/upgrade-modal.tsx`
   - Translation keys in `business-panel/src/lib/i18n/translations.ts` (EN + HE) for any new feature description strings

2. **If a feature is removed** — remove it from all plan definitions and drop the backend enforcement check.

3. **Upgrade modals** — any UI action gated behind a plan must intercept the action client-side (show `<UpgradeModal>`) AND reject server-side (throw `ForbiddenException` with `requiredPlan`). Never gate only one side.

4. **Plan tiers (for reference):**
   - `FREE` — 1 campaign/month, RAFFLE / EVERY_N only, no financial analytics, no duplication
   - `STARTER` — 5 campaigns/month, all types (RAFFLE, EVERY_N, SNAKE, POINT_GUESS), duplication, financial analytics
   - `GROWTH` — 20 campaigns/month, everything in Starter + activity audit log
   - `ENTERPRISE` — unlimited campaigns, everything in Growth
   - Campaign limit = campaigns **created this calendar month** (not concurrent active campaigns)

כל שינוי בלוח הניהול שמוסיף, מסיר או משנה פיצ'ר **חייב** להיות מתואם עם הגדרות תוכניות החיוב. יש לעדכן את `PLAN_LIMITS` ב-backend, את שכבות האכיפה, את רשימות הפיצ'רים בדף החיוב ובמודל השדרוג, ואת מפתחות התרגום.

---

## Product Overview / סקירת המוצר

MrBar is a two-sided promotions, raffles, and notifications platform for physical venues (bars, clubs, restaurants). Businesses launch real-time campaigns (e.g. "buy a Heineken in the next 15 min, enter a raffle for 20 free shots"), customers receive push notifications, scan a QR/enter a code at the POS, and are entered into the raffle or receive an instant reward.

MrBar היא פלטפורמה דו-צדדית למבצעים, הגרלות והתראות עבור מקומות פיזיים (ברים, מועדונים, מסעדות). עסקים משיקים קמפיינים בזמן אמת (למשל: "קנה היינקן ב-15 הדקות הקרובות, הצטרף להגרלה על 20 שוטים חינם"), לקוחות מקבלים התראות push, סורקים QR או מזינים קוד בקופה, ונכנסים להגרלה או מקבלים פרס מיידי.

---

## Architecture / ארכיטקטורה

Three separate apps share a common backend:
שלושה אפליקציות נפרדות חולקות backend משותף:

| App | Tech | Purpose / מטרה |
|-----|------|---------|
| `backend` | Node.js + NestJS | REST API, business logic, queues |
| `customer_app` | Flutter | iOS + Android customer app / אפליקציית לקוח |
| `business-panel` | Next.js | Web dashboard for business owners/staff / לוח בקרה לבעלי עסקים |

### Backend Services (NestJS modules)
`auth` · `users` · `businesses` · `branches` · `employees` · `campaigns` · `entries` · `rewards` · `redemptions` · `notifications` · `analytics` · `billing` · `fraud` · `admin`

### Infrastructure / תשתית
- **Database / בסיס נתונים:** PostgreSQL
- **Cache / queues / תורים:** Redis + BullMQ
- **Push notifications / התראות:** Firebase (FCM) + APNS
- **File storage / אחסון קבצים:** S3 / Cloudinary
- **Maps / מפות:** Google Maps / Mapbox
- **Monitoring / ניטור:** Sentry + Grafana + PostHog

### Key Domain Concepts / מושגי מפתח
- **Campaign / קמפיין** – time-boxed promotion with eligibility rules, required product, reward, and a win mechanism (raffle / instant / every-N / weighted odds). מבצע מוגבל בזמן עם כללי זכאות, מוצר נדרש, פרס ומנגנון זכייה.
- **Entry / השתתפות** – a participation event created when a customer scans a dynamic QR or submits a purchase code. Includes duplicate-prevention (hash + TTL + device fingerprint). אירוע השתתפות שנוצר כשלקוח סורק QR דינמי או מגיש קוד רכישה.
- **Reward / UserReward / פרס** – prize allocated to a winner; has inventory cap, expiry window, and a one-time redemption QR. פרס שהוקצה לזוכה; כולל מגבלת מלאי, חלון תפוגה וקוד QR חד-פעמי למימוש.
- **Redemption / מימוש** – staff-side action that marks a UserReward as used; validated by branch and short-lived code. פעולה מצד הצוות שמסמנת פרס כמומש; מאומתת לפי סניף וקוד קצר-חיים.

### Auth & Permissions / אימות והרשאות
- JWT access (15m) + refresh (30d) tokens, OTP via SMS, Google/Apple social login.
- RBAC roles: `customer` | `owner` | `manager` | `bartender` | `cashier` | `hostess` | `admin`.

### QR Entry Flow / זרימת כניסה דרך QR
- Business panel generates a JWT-signed QR (65s expiry, auto-rotates every 60s) containing `{campaignId, branchId, ts}`.
- Customer app scans it → POST `/entries` with the raw JWT as `code`.
- Backend decodes the JWT to extract `campaignId` + `branchId`, then validates campaign is ACTIVE.
- `assertCampaignActive`: status must be `ACTIVE`; `endsAt` must not have passed. **The `startsAt` guard is intentionally skipped when status is ACTIVE** — an explicit activation overrides the schedule.

לוח הניהול מייצר QR חתום ב-JWT (תפוגה 65 שניות) המכיל `{campaignId, branchId, ts}`. אפליקציית הלקוח סורקת → POST `/entries` עם ה-JWT הגולמי כ-`code`. ה-backend מפענח את ה-JWT לחלץ `campaignId` + `branchId`, ואז מאמת שהקמפיין פעיל.

### Snake Game / משחק סנייק
- Campaign type: snake. Customers scan a campaign QR → play a browser-based snake game → score recorded as entry.
- 15×15 grid, Ticker-based game loop (60fps), smooth sub-tick interpolation, wall collision = instant death.
- Leaderboard shows top scores; top scorers when campaign ends win the prize.

---

## Internationalization / בינאום (i18n)

### Default language: Hebrew (RTL) / שפה ברירת מחדל: עברית (RTL)

**Business Panel (Next.js):**
- Font: **Heebo** (Google Fonts, hebrew + latin subsets) — elegant RTL/LTR typeface.
- Locale store: Zustand + localStorage persistence (`mrbar-locale`). Default: `he`.
- Translations: `src/lib/i18n/translations.ts` — flat `en`/`he` maps, 100+ keys.
- RTL: `<html dir="rtl" lang="he">` set server-side; `LocaleHtml` client component syncs on change.
- Language toggle: sidebar footer, above logout button (עברית / English, amber highlight for active).
- Usage in pages: `const t = useLocaleStore(s => s.t);` then `t('key')`.

**Customer App (Flutter):**
- Font: **Heebo** via `google_fonts` package — applied as `GoogleFonts.heeboTextTheme` in `AppTheme`.
- Locale provider: Riverpod `NotifierProvider<LocaleNotifier, Locale>` — persisted to `flutter_secure_storage`. Default: `Locale('he')`.
- Translations: `lib/core/l10n/app_l10n.dart` — static `AppL10n.of(locale, key)` helper, 100+ keys across all screens.
- RTL: automatic via `flutter_localizations` delegates in `MaterialApp` when locale is `he`.
- Language toggle: Settings screen → שפה / Language section with Hebrew/English tiles.
- Usage in screens: `final locale = ref.watch(localeProvider); String t(String key) => AppL10n.of(locale, key);`
- Pre-loads saved locale before `runApp` via `ProviderContainer`.

---

## UI / UX Notes / הערות ממשק

- **Business panel is mobile-responsive**: sidebar becomes slide-out drawer on mobile, tables scroll horizontally, forms collapse to single-column.
- **DateTime timezone**: all `endsAt`/`startsAt` values from the API are UTC ISO strings (Z suffix). Always call `.toLocal()` before formatting for display in Flutter.
- **Campaign status flow**: `DRAFT → SCHEDULED → ACTIVE ⇄ PAUSED → ENDED / CANCELLED`

---

## Commands / פקודות

### Local infrastructure / תשתית מקומית (PostgreSQL + Redis)
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

### Business Panel (Next.js)
```bash
cd business-panel
npm run dev                # runs on port 3001
```

### Customer App (Flutter)
```bash
cd customer_app
flutter run
flutter pub get            # after pubspec.yaml changes
```

### Node.js PATH note
Node is installed via Homebrew. If `node`/`npm` are not found, run:
```bash
export PATH="/opt/homebrew/bin:$PATH"
```
