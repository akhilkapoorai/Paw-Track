# PawTrack — Lost Pet Tracker
## Replit Build Prompt v2

---

## PROJECT OVERVIEW

Build a full-stack mobile-optimized web application called **PawTrack**. It is a lost pet community tracking platform where:

- Pet owners report a lost pet with photo + last seen map location
- Community members submit sightings with photo + pin drop location
- The app renders a live path of verified sightings on a map
- Google Gemini AI extends the verified path with a predicted probable travel route (shown as a dotted line)
- Anyone can browse and view pet profiles without logging in
- Google or Facebook login is required only to report a pet or submit a sighting
- Sightings publish immediately to the map; the pet owner can flag or remove bad ones

The app uses **professional solid colors**, is **optimized for mobile web**, and supports camera photo capture directly from the browser.

---

## EXTERNAL ACCOUNTS REQUIRED

Only **one** external service needs to be configured:

1. **Firebase Project** — for Google/Facebook OAuth login and photo storage (free tier)
2. **Google Gemini API Key** — for AI path prediction (free tier: 1,500 req/day)

Everything else (database, maps, geocoding) requires no external accounts.

---

## TECH STACK

### Frontend
- **React 18** with **TypeScript**
- **Vite** as the build tool
- **Tailwind CSS v3** for all styling
- **shadcn/ui** for base UI components (buttons, modals, toasts, badges, tabs)
- **React Router v6** for client-side routing
- **React Leaflet v4** + **Leaflet v1.9** for maps and path rendering (OpenStreetMap tiles — no API key)
- **TanStack Query v5** (React Query) for data fetching and caching
- **React Hook Form** + **Zod** for form validation
- **Axios** for HTTP requests
- **browser-image-compression** for client-side image compression before upload
- **date-fns** for date formatting
- **Lucide React** for icons
- **socket.io-client** for real-time sighting updates

### Backend
- **Node.js 20+** with **Express 4**
- **TypeScript**
- **Prisma ORM** with **PostgreSQL** (Replit's built-in PostgreSQL — uses auto-injected `DATABASE_URL`)
- **Firebase Admin SDK** for verifying Google/Facebook auth tokens server-side
- **Multer** for handling multipart image uploads before sending to Firebase Storage
- **@google/generative-ai** (Gemini SDK) for AI path prediction
- **socket.io** for real-time push when a sighting is added
- **express-rate-limit** for abuse prevention
- **helmet** for HTTP security headers
- **cors** configured to allow only the client origin
- **zod** for server-side input validation
- **winston** for structured logging
- **xss** for sanitizing user text inputs before storing

### Authentication
- **Firebase Authentication** — Google OAuth and Facebook OAuth only
- No email/password sign-in
- Firebase ID tokens verified server-side via Firebase Admin SDK on every protected route

### Storage
- **Firebase Storage** — for pet photos and sighting photos
- Public read URLs, authenticated writes only

### Database
- **Replit built-in PostgreSQL** — connection string auto-available as `DATABASE_URL` in Replit environment
- **Prisma** as ORM with migration support

### AI
- **Google Gemini 1.5 Flash** via `@google/generative-ai`
- Free tier: 15 RPM, 1,500 RPD, 1M tokens/day
- Structured JSON output mode for reliable coordinate predictions
- Predictions cached in the database to minimize API calls

---

## FOLDER STRUCTURE

```
pawtrack/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui base components
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── BottomNav.tsx    # Mobile bottom navigation bar
│   │   │   │   └── PageWrapper.tsx
│   │   │   ├── map/
│   │   │   │   ├── TrackingMap.tsx       # Full pet profile map with path layers
│   │   │   │   ├── PinDropMap.tsx        # Map for dropping a single location pin
│   │   │   │   ├── VerifiedPathLayer.tsx # Solid navy polyline + circle markers
│   │   │   │   ├── PredictedPathLayer.tsx# Dashed amber polyline + ghost markers
│   │   │   │   └── MapLegend.tsx         # Verified vs Predicted legend
│   │   │   ├── pet/
│   │   │   │   ├── PetCard.tsx
│   │   │   │   ├── PetStatusBadge.tsx
│   │   │   │   └── ReportPetForm.tsx     # Multi-step form
│   │   │   ├── sighting/
│   │   │   │   ├── SightingCard.tsx
│   │   │   │   ├── SightingForm.tsx
│   │   │   │   └── FlagButton.tsx        # Owner-only flag/remove control
│   │   │   ├── auth/
│   │   │   │   ├── AuthModal.tsx         # Bottom sheet: Google + Facebook buttons
│   │   │   │   └── ProtectedAction.tsx   # Wrapper that triggers auth if not signed in
│   │   │   └── shared/
│   │   │       ├── ImageUpload.tsx       # Camera + gallery upload component
│   │   │       ├── Timeline.tsx          # Pet update history
│   │   │       └── StepIndicator.tsx     # Multi-step form progress
│   │   ├── pages/
│   │   │   ├── HomePage.tsx             # Browse lost pets feed
│   │   │   ├── ReportPetPage.tsx        # Report a lost pet (3-step form)
│   │   │   ├── PetProfilePage.tsx       # Individual pet tracking page (tabs)
│   │   │   ├── AddSightingPage.tsx      # Submit a sighting
│   │   │   └── OwnerDashboardPage.tsx   # Owner's pet management
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── usePets.ts
│   │   │   ├── useSightings.ts
│   │   │   └── useReverseGeocode.ts     # Nominatim reverse geocoding hook
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── lib/
│   │   │   ├── firebase.ts             # Firebase client SDK init
│   │   │   ├── api.ts                  # Axios instance with auth header injection
│   │   │   └── utils.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts                  # Proxy /api → localhost:5000
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── pets.ts
│   │   │   ├── sightings.ts
│   │   │   ├── updates.ts
│   │   │   └── uploads.ts
│   │   ├── middleware/
│   │   │   ├── authMiddleware.ts       # Verify Firebase ID token
│   │   │   ├── rateLimiter.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── validate.ts
│   │   ├── services/
│   │   │   ├── petService.ts
│   │   │   ├── sightingService.ts
│   │   │   ├── aiService.ts            # Gemini path prediction
│   │   │   └── storageService.ts       # Firebase Storage uploads
│   │   ├── lib/
│   │   │   ├── prisma.ts
│   │   │   ├── firebaseAdmin.ts
│   │   │   ├── gemini.ts               # Gemini client init
│   │   │   └── logger.ts
│   │   ├── schemas/
│   │   │   └── validation.ts           # All Zod schemas
│   │   └── index.ts                    # Express app + Socket.io setup
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── tsconfig.json
│   └── package.json
│
├── client/package.json
├── package.json                        # Root with npm workspaces + concurrently
├── .env.example
└── README.md
```

---

## DATABASE SCHEMA

Create `server/prisma/schema.prisma` with this exact content:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String      @id @default(cuid())
  firebaseUid  String      @unique
  displayName  String
  email        String      @unique
  photoUrl     String?
  provider     String      // "google" | "facebook"
  createdAt    DateTime    @default(now())
  pets         Pet[]
  sightings    Sighting[]
  updates      PetUpdate[]
}

model Pet {
  id               String      @id @default(cuid())
  name             String
  species          String      // "dog" | "cat" | "other"
  breed            String?
  color            String
  size             String      // "small" | "medium" | "large"
  age              String?
  description      String
  photoUrl         String
  status           PetStatus   @default(LOST)
  lastSeenAddress  String
  lastSeenLat      Float
  lastSeenLng      Float
  lastSeenAt       DateTime
  ownerId          String
  owner            User        @relation(fields: [ownerId], references: [id])
  sightings        Sighting[]
  updates          PetUpdate[]
  aiPathCache      Json?       // { coordinates: [{lat, lng, confidence, reasoning}], summary: string, generatedAt: string, approved: boolean }
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
}

model Sighting {
  id           String    @id @default(cuid())
  petId        String
  pet          Pet       @relation(fields: [petId], references: [id], onDelete: Cascade)
  reporterId   String
  reporter     User      @relation(fields: [reporterId], references: [id])
  photoUrl     String
  lat          Float
  lng          Float
  address      String
  seenAt       DateTime
  notes        String?
  confidence   String    @default("medium") // "high" | "medium" | "low"
  isFlagged    Boolean   @default(false)    // Owner flagged as invalid
  flaggedAt    DateTime?
  sequence     Int       // 1 = owner's original last-seen location; 2+ = community sightings in order
  createdAt    DateTime  @default(now())
}

model PetUpdate {
  id        String     @id @default(cuid())
  petId     String
  pet       Pet        @relation(fields: [petId], references: [id], onDelete: Cascade)
  authorId  String
  author    User       @relation(fields: [authorId], references: [id])
  content   String
  type      UpdateType @default(GENERAL)
  createdAt DateTime   @default(now())
}

enum PetStatus {
  LOST
  FOUND
  REUNITED
}

enum UpdateType {
  GENERAL
  SIGHTING_FLAGGED
  SIGHTING_REMOVED
  PET_FOUND
  PET_STILL_MISSING
  OWNER_NOTE
  AI_PATH_APPROVED
  AI_PATH_DENIED
}
```

After setup, run: `npx prisma migrate dev --name init`

---

## ENVIRONMENT VARIABLES

Create `.env.example` at the root:

```env
# ---- SERVER ----
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# ---- DATABASE ----
# Replit auto-injects this. No manual setup needed.
DATABASE_URL=

# ---- FIREBASE ADMIN (server-side only — never expose these to client) ----
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com

# ---- GEMINI AI ----
GEMINI_API_KEY=

# ---- CLIENT (VITE_ prefix = safe to expose in browser) ----
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Store all values in **Replit Secrets** (not in a committed `.env` file).
Replit automatically provides `DATABASE_URL` — do not override it.

---

## DESIGN SYSTEM

### Color Palette

```css
/* Primary — deep navy blue */
--color-primary:        #1B4F72;
--color-primary-light:  #2E86C1;
--color-primary-dark:   #154360;

/* Accent — warm amber (urgency, CTAs) */
--color-accent:         #E67E22;
--color-accent-light:   #F0A060;
--color-accent-dark:    #CA6F1E;

/* Status */
--color-lost:           #E74C3C;   /* Red */
--color-found:          #27AE60;   /* Green */
--color-reunited:       #8E44AD;   /* Purple */

/* Surfaces & Text */
--color-background:     #F4F6F8;
--color-surface:        #FFFFFF;
--color-border:         #DDE3EA;
--color-text-primary:   #1A2332;
--color-text-secondary: #5D6D7E;
--color-text-muted:     #95A5A6;

/* Map Path */
--color-verified-path:  #1B4F72;   /* Solid navy */
--color-predicted-path: #E67E22;   /* Dashed amber */
```

Configure all of these as custom colors in `tailwind.config.ts` under `theme.extend.colors`.

### Typography
- Font: **Inter** — import via Google Fonts in `index.html`
- Headings: `font-bold`
- Body: `font-normal`, `text-base` or `text-sm`

### Map Path Visual Rules (Leaflet)

**Verified path (owner + approved sightings):**
```javascript
// Solid navy polyline
L.polyline(coordinates, {
  color: '#1B4F72',
  weight: 4,
  opacity: 1
})

// Circle markers at each verified pin
L.circleMarker([lat, lng], {
  radius: 8,
  fillColor: '#1B4F72',
  color: '#FFFFFF',
  weight: 2,
  fillOpacity: 1
})

// Owner's starting pin — red, larger
L.circleMarker([lat, lng], {
  radius: 11,
  fillColor: '#E74C3C',
  color: '#FFFFFF',
  weight: 2,
  fillOpacity: 1
})
```

**AI predicted extension path:**
```javascript
// Dashed amber polyline
L.polyline(coordinates, {
  color: '#E67E22',
  weight: 3,
  opacity: 0.85,
  dashArray: '8, 6'
})

// Ghost markers at predicted points — semi-transparent amber
L.circleMarker([lat, lng], {
  radius: 7,
  fillColor: '#E67E22',
  color: '#FFFFFF',
  weight: 2,
  fillOpacity: 0.5
})
```

**Map legend** — fixed top-right overlay on each map showing:
- Navy solid line + "Verified Path"
- Amber dashed line + "AI Predicted Path"
- Red dot + "Last seen by owner"

---

## PAGE SPECIFICATIONS

### 1. HOME PAGE (`/`)

**Header (sticky):**
- Left: Paw print icon + "PawTrack" wordmark in `color-primary`
- Right: "Report Lost Pet" button in `color-accent`
- On mobile: compact, icon-only nav items

**Hero:**
- Headline: "Help Find Lost Pets Near You"
- Subtitle: "Browse reports, submit sightings, and track pets with your community"
- Search/filter bar below headline

**Filter bar:**
- Filter by species: All | Dog | Cat | Other
- Filter by status: All | Lost | Found | Reunited
- Sort: Newest first (default) | Recently updated

**Pet Feed:**
- Responsive card grid: 1 col on mobile, 2 col on sm, 3 col on md, 4 col on lg
- Loading state: skeleton card grid (6 cards)
- Empty state: paw print illustration + "No lost pets in your area yet"
- Paginated — load 12 cards, "Load more" button at bottom

**Pet Card:**
- Pet photo (fixed aspect ratio 4:3, `object-fit: cover`)
- Name + species chip
- Status badge (color-coded: LOST=red, FOUND=green, REUNITED=purple)
- "Last seen X days ago"
- Location string (city/neighborhood)
- "View Tracker →" button
- Subtle hover shadow elevation effect

**Bottom Navigation (mobile only, fixed):**
- Home icon → `/`
- Report icon → `/report`
- Dashboard icon → `/dashboard` (shows login prompt if not signed in)

---

### 2. REPORT LOST PET PAGE (`/report`)

Requires authentication. If not signed in, show AuthModal first, then return here.

**Progress indicator:** 3 numbered steps at top — "Pet Details", "Photo", "Last Seen Location"

**Step 1 — Pet Details:**
- Pet name (text, required)
- Species (segmented control: Dog / Cat / Other)
- Breed (text, optional)
- Primary color (text, required — e.g. "Golden brown with white chest")
- Size (segmented control: Small / Medium / Large)
- Age (text, optional — e.g. "3 years")
- Description (textarea, required — "Distinctive features, collar color, microchipped, behavior")
- "Next →" button — validates step before proceeding

**Step 2 — Photo:**
- Large upload zone (dashed border, center-aligned)
- On mobile: two large tap targets stacked — "📷 Take a Photo" and "🖼 Choose from Gallery"
  - "Take a Photo" uses `<input type="file" accept="image/*" capture="environment">`
  - "Choose from Gallery" uses `<input type="file" accept="image/*">`
- On desktop: drag-and-drop zone with file picker fallback
- After selection: show preview image with "Remove" option
- Compress to max 1200px / 1.5MB using `browser-image-compression` before upload
- Upload photo to Firebase Storage on "Next" click
- Return Firebase Storage URL to use in final submission
- "Next →" button (disabled until photo selected and uploaded)

**Step 3 — Last Seen Location:**
- Full-width Leaflet map (350px height on mobile, 450px on desktop)
- OpenStreetMap tiles: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- Map auto-centers on user's browser geolocation (ask permission, fallback to US center)
- Instructions overlay: "Tap or click the map to drop a pin"
- On map click: place a draggable red marker
- On marker place or drag end: call Nominatim reverse geocoding to auto-fill address
  - Endpoint: `https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json`
  - Include header: `User-Agent: PawTrack/1.0`
  - Populate address field below map automatically
- Address text field (editable, pre-filled from geocoding, required)
- Date + time picker: "When did you last see them?" (required, must be in past)
- "Submit Report" button — shows spinner, calls POST `/api/v1/pets`, redirects to new pet profile

---

### 3. PET PROFILE PAGE (`/pet/:id`)

This is the primary page of the application. Layout:

**Hero section:**
- Large pet photo (full-width on mobile, 40% left panel on desktop, `object-fit: cover`)
- Name, species, breed (if provided)
- Status badge + "Last seen X days ago at [City]"
- Owner line: "Reported by [First Name]" + owner avatar
- Two CTA buttons side by side:
  - "Add a Sighting" — primary, color-accent (triggers auth if not signed in)
  - "Share" — secondary, copies link to clipboard + shows "Link copied!" toast

**Tab Bar (sticky below hero):** 3 tabs
- "📍 Live Tracker"
- "👁 Sightings ([count])"
- "📋 Updates"

---

**TAB 1: LIVE TRACKER**

- Full-width Leaflet map — 400px height on mobile, 500px on desktop
- Map shows:
  - **Red circle marker** at owner's last seen location (labeled "Last seen by owner")
  - **Navy solid polyline** connecting all non-flagged community sightings in sequence order
  - **Navy circle markers** at each verified sighting pin (numbered: #1, #2, #3...)
  - **Dashed amber polyline** extending from the last verified sighting pin, showing AI predicted path
  - **Semi-transparent amber circle markers** at each AI predicted coordinate
- Map auto-fits bounds to show all pins (owner + sightings + AI) with 50px padding
- Clicking any marker opens a Leaflet popup showing:
  - Thumbnail photo
  - Date/time
  - Reporter name
  - Location address
  - Notes excerpt (if any)
- Map legend (top-right overlay) — always visible
- Below map: "Path last updated [time]" + "AI prediction generated [time]"

**AI Path Approval (owner only — show when logged in as pet owner):**
- Banner card below the map (amber background, rounded)
- "🤖 AI has generated a new predicted path based on [N] sightings. Review it above."
- [✓ Approve Prediction] [✗ Dismiss] buttons
- If approved: amber dashed path shows with an "Owner Approved" badge on the legend
- If dismissed: AI path hidden from public view; banner shows "Prediction dismissed. Will regenerate on next sighting."
- State persisted in `aiPathCache.approved` boolean in the database

**If fewer than 2 sightings:**
- Replace dashed path area with info card: "AI path prediction becomes available after at least 2 community sightings are added"

---

**TAB 2: SIGHTINGS**

- Chronological list (oldest first = #1 is owner's original location)
- Each sighting card:
  - Sequence badge (#1, #2, #3...)
  - Sighting photo (tap to expand)
  - Reporter name + avatar
  - Date and time (formatted: "Monday, Jan 15 at 2:30 PM")
  - Address
  - Notes (if any)
  - Confidence badge: High (green) / Medium (yellow) / Low (gray)
  - **Flag button (owner only):** "🚩 Flag as Invalid" — marks `isFlagged: true`, hides from map, adds timeline event
  - **Flagged badge:** if sighting is flagged, show "Flagged as invalid" chip; flagged sightings are greyed out in list but still shown to owner for context

- Empty state: "No sightings yet. If you've seen this pet, tap 'Add a Sighting' to help."
- "Add a Sighting" card at the bottom of the list (same CTA)

---

**TAB 3: UPDATES & HISTORY**

- Reverse-chronological timeline
- Timeline event types (each has an icon, label, and timestamp):
  - 🐾 "Pet reported lost" — system event on creation
  - 👁 "New sighting added by [name]" — system event on each sighting
  - 🚩 "Sighting flagged as invalid by owner" — system event on flag
  - 🤖 "AI path prediction updated"
  - ✅ "AI path approved by owner"
  - 📝 Owner note (free text, posted manually)
  - ✅ "Status changed to Found"
  - 🏠 "Pet has been reunited with owner!"

- **Owner controls (visible only when logged in as owner):**
  - Text area: "Post an update..." with "Post" button
  - Status buttons: "Mark as Found" | "Mark as Reunited" | "Still Missing"
  - Changing status adds a system timeline event and updates the status badge site-wide

---

### 4. ADD SIGHTING PAGE (`/pet/:id/sighting`)

Requires authentication. If not signed in, show AuthModal first, then return here.

Single scrollable form (no steps — keep it fast):

**Section 1 — When:**
- Date picker (required, cannot be future date)
- Time picker (required)

**Section 2 — Where:**
- Same Leaflet pin-drop map as report form (350px height on mobile)
- "Use my current location" button (auto-places pin at GPS location)
- Address field (auto-filled from Nominatim reverse geocoding on pin drop)

**Section 3 — Photo Evidence:**
- Same ImageUpload component (camera or gallery)
- Required — clearly labeled "A photo is required to submit a sighting"

**Section 4 — Details:**
- Notes textarea: "Describe what you observed — behavior, direction of travel, condition" (optional)
- Confidence selector (segmented control): "High — I'm sure it's the same pet" / "Medium — Looks similar" / "Low — Might be the same pet"

**Submit button:**
- Full-width, amber, "Submit Sighting"
- Shows loading spinner while uploading photo + submitting
- On success: redirect to `/pet/:id` with tracker tab active
- Show success toast: "✓ Your sighting has been added. The path has been updated."
- On error: show inline error with retry option

---

### 5. OWNER DASHBOARD (`/dashboard`)

Requires authentication. Redirect to home with auth modal if not signed in.

- Page title: "My Reported Pets"
- List of pets the logged-in user has reported
- Each pet row shows: photo thumbnail, name, status badge, sighting count, "View Tracker" + "Manage" links
- "Manage" expands inline controls:
  - Change status dropdown
  - "Edit pet details" link → edit form (same fields as report form, pre-filled)
  - "Delete report" (with confirmation dialog)
- Empty state: "You haven't reported any lost pets yet." + "Report a Lost Pet" CTA

---

## AUTHENTICATION FLOW

**Trigger:** Any time an unauthenticated user taps a protected action (Report, Add Sighting, Dashboard):
1. Show **AuthModal** — a bottom sheet on mobile, centered modal on desktop
2. Modal headline: "Sign in to continue"
3. Subtext: "Sign in to report a lost pet or submit a sighting. It only takes a second."
4. "Continue with Google" button (white, Google logo, full-width)
5. "Continue with Facebook" button (Facebook blue, Facebook logo, full-width)
6. "Cancel" text link
7. After sign-in: Firebase returns user + ID token
8. Client sends token to `POST /api/v1/auth/sync` to upsert user in PostgreSQL
9. Store Firebase user in `AuthContext` and React state (no localStorage)
10. Dismiss modal and proceed with original action

**Token refresh:** Firebase SDK handles ID token refresh automatically. Always call `user.getIdToken()` (not `getIdToken(true)`) before each API call to get a fresh token when needed.

**Server-side verification:**
- `authMiddleware.ts` calls `firebaseAdmin.auth().verifyIdToken(token)`
- Attaches `req.user = { uid, email, displayName }` to request
- Returns 401 if token missing or invalid

---

## BACKEND API ROUTES

All routes prefixed with `/api/v1`

### Pets
```
GET    /pets                       Query params: species, status, page, limit (default 12)
GET    /pets/:id                   Returns pet + sightings + aiPathCache + updates
POST   /pets                       Auth required — create lost pet report
PATCH  /pets/:id                   Auth required, owner only — update name/desc/status/etc
PATCH  /pets/:id/status            Auth required, owner only — change PetStatus
PATCH  /pets/:id/approve-ai-path   Auth required, owner only — set aiPathCache.approved = true
PATCH  /pets/:id/deny-ai-path      Auth required, owner only — clear aiPathCache
```

### Sightings
```
GET    /pets/:petId/sightings       Returns all non-flagged sightings (+ flagged if owner)
POST   /pets/:petId/sightings       Auth required — submit sighting, triggers AI regeneration
PATCH  /sightings/:id/flag          Auth required, owner only — flag sighting as invalid
PATCH  /sightings/:id/unflag        Auth required, owner only — unflag sighting
```

### Updates
```
GET    /pets/:petId/updates         Public — returns timeline
POST   /pets/:petId/updates         Auth required, owner only — post owner note
```

### Uploads
```
POST   /uploads/image               Auth required — receives multipart image, uploads to Firebase Storage, returns { url }
```

### Auth
```
POST   /auth/sync                   Auth required — upsert user in PostgreSQL after first login
GET    /auth/me                     Auth required — return current user profile
```

### Health
```
GET    /health                      Returns { status: "ok", timestamp }
```

---

## AI PATH PREDICTION (Gemini)

Create `server/src/services/aiService.ts`:

**Trigger conditions:**
- A new sighting is added (auto-trigger, async — don't block the sighting POST response)
- At least 2 location points exist (owner location + 1 sighting minimum)
- Cache is older than 6 hours OR a new sighting was just added

**Implementation:**

```typescript
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    predictedPath: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          lat: { type: SchemaType.NUMBER },
          lng: { type: SchemaType.NUMBER },
          confidence: { type: SchemaType.STRING }, // "high" | "medium" | "low"
          reasoning: { type: SchemaType.STRING }
        },
        required: ['lat', 'lng', 'confidence', 'reasoning']
      }
    },
    summary: { type: SchemaType.STRING }
  },
  required: ['predictedPath', 'summary']
};

async function predictPath(pet, verifiedLocations) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema
    }
  });

  const prompt = `
    You are an animal search-and-rescue expert. A lost ${pet.species} named "${pet.name}" 
    has been spotted at the following GPS locations in chronological order:
    
    ${verifiedLocations.map((loc, i) => 
      `${i + 1}. Lat: ${loc.lat}, Lng: ${loc.lng} — ${loc.timestamp}${loc.notes ? ` — Notes: "${loc.notes}"` : ''}`
    ).join('\n')}
    
    Based on the direction of travel, time intervals between sightings, and typical ${pet.species} behavior patterns:
    - Dogs tend to follow roads, head toward parks and food smells, and move 1-4 miles per day when lost
    - Cats typically stay within 1-3 blocks of familiar territory, hide during day, move at night
    
    Predict the next 3-5 GPS coordinates where this pet is most likely to be found.
    Each coordinate must be geographically realistic given the existing path (small incremental movements, not large jumps).
    Return a confidence level and brief reasoning for each predicted point.
    Also provide a 2-sentence summary of the predicted movement pattern.
  `;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}
```

**After prediction:**
- Store result in `pet.aiPathCache = { coordinates, summary, generatedAt: new Date(), approved: false }`
- Emit Socket.io event `ai:path-updated` to all clients viewing this pet
- If previous cache had `approved: true`, reset to `approved: false` (new prediction needs re-approval)

**Error handling:**
- If Gemini call fails: log error, keep existing cache, do not surface error to end user
- If fewer than 2 verified locations: skip prediction entirely
- Wrap in try/catch — never let AI failure break the sighting submission flow

---

## SOCKET.IO REAL-TIME EVENTS

**Server setup (in `server/src/index.ts`):**
```typescript
const io = new Server(httpServer, { cors: { origin: process.env.CLIENT_URL } });

// After sighting is saved:
io.to(`pet:${petId}`).emit('sighting:new', {
  sighting,          // new sighting data
  verifiedPath,      // updated array of all non-flagged coordinates
});

// After AI path regenerates (async, may be a few seconds later):
io.to(`pet:${petId}`).emit('ai:path-updated', {
  aiPath,            // new predicted coordinates array
  summary            // AI summary text
});
```

**Client setup (in `PetProfilePage.tsx`):**
```typescript
useEffect(() => {
  socket.emit('join:pet', petId);        // join room for this pet
  socket.on('sighting:new', (data) => {
    queryClient.setQueryData(['pet', petId], ...);  // update cached pet data
    showToast('New sighting added! Map updated.');
  });
  socket.on('ai:path-updated', (data) => {
    // Update AI path layer on map without full reload
  });
  return () => {
    socket.emit('leave:pet', petId);
    socket.off('sighting:new');
    socket.off('ai:path-updated');
  };
}, [petId]);
```

---

## IMAGE UPLOAD COMPONENT

`client/src/components/shared/ImageUpload.tsx`

Props: `onUpload: (url: string) => void`, `label: string`, `required: boolean`

Behavior:
1. On mobile, render two equally-sized tap targets stacked vertically:
   - "📷 Take Photo" → triggers `<input capture="environment" accept="image/*">`
   - "🖼 Choose from Gallery" → triggers `<input accept="image/*">` (no capture)
2. On desktop, render a drag-and-drop zone with dashed border and file picker button
3. After file selected:
   - Compress using `browser-image-compression` to max 1200px / 1.5MB
   - Show preview image in a rounded box with "✕ Remove" button
4. Upload happens when parent form moves to next step or on submission
5. POST to `/api/v1/uploads/image` as `multipart/form-data` with `Authorization` header
6. Show upload progress via a thin progress bar below the preview
7. On success: call `onUpload(url)` with the Firebase Storage URL
8. On error: show retry button with error message

---

## GEOCODING (FREE — NO API KEY REQUIRED)

Use **Nominatim** (OpenStreetMap's geocoding API) for reverse geocoding when a pin is dropped.

```typescript
// client/src/hooks/useReverseGeocode.ts
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { 'User-Agent': 'PawTrack/1.0 (pawtrack.app)' } }
  );
  const data = await res.json();
  // Return neighborhood + city, or full display_name as fallback
  const parts = [
    data.address?.neighbourhood || data.address?.suburb,
    data.address?.city || data.address?.town || data.address?.village,
    data.address?.state
  ].filter(Boolean);
  return parts.join(', ') || data.display_name;
}
```

**Rate limit:** Nominatim allows max 1 request/second. Debounce pin drag events by 800ms before calling.

---

## RATE LIMITING & SECURITY

```typescript
// POST routes: max 20 requests per 15 minutes per IP
const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait and try again.' } }
});

// Apply to all POST/PATCH routes
app.use('/api/v1/pets', postLimiter);
app.use('/api/v1', postLimiter);
```

- All text inputs sanitized with `xss()` before saving to database
- Helmet.js applied as first middleware
- CORS: `origin: process.env.CLIENT_URL` only
- File uploads: accept only `image/jpeg`, `image/png`, `image/webp`, `image/heic` — reject others
- File size limit: 10MB server-side (client compresses to <2MB before sending)
- All auth-required routes return `401` if token missing, `403` if token valid but wrong owner

---

## LOADING, EMPTY & ERROR STATES

| State | Implementation |
|---|---|
| Home feed loading | 6 skeleton cards in the grid |
| Pet profile loading | Skeleton: photo block + text lines + map placeholder |
| Map tiles loading | Spinner overlay on map container until first tile loads |
| No pets | Paw icon + "No lost pets reported yet. Help your community!" |
| No sightings | Eye icon + "No sightings yet. Be the first to help." |
| AI not ready | Info card: "AI predictions available after 2 sightings" |
| Form error | Inline red message below each invalid field |
| Upload error | Amber banner with retry button |
| API error | Toast notification at bottom of screen (mobile-friendly) |
| Geocoding unavailable | Fallback to manual address entry, no error thrown |

---

## SEED DATA

Create `server/prisma/seed.ts` to insert:

- 2 users (Google provider)
- 3 pets: 1 dog (LOST), 1 cat (LOST), 1 dog (FOUND)
- 3 sightings for the first dog at realistic incremental coordinates
- Realistic `aiPathCache` JSON for the first dog with 4 predicted coordinates
- 4 PetUpdates on the first dog (system event, owner note, AI updated, sighting added)

Run: `npx prisma db seed`

---

## ROOT PACKAGE.JSON

```json
{
  "name": "pawtrack",
  "private": true,
  "workspaces": ["client", "server"],
  "scripts": {
    "dev": "concurrently \"npm run dev --workspace=server\" \"npm run dev --workspace=client\"",
    "build": "npm run build --workspace=server && npm run build --workspace=client",
    "db:migrate": "npm run db:migrate --workspace=server",
    "db:seed": "npm run db:seed --workspace=server",
    "db:studio": "npm run db:studio --workspace=server"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

---

## REPLIT CONFIGURATION

Create `.replit` file at root:

```toml
run = "npm run dev"
entrypoint = "server/src/index.ts"

[nix]
channel = "stable-23_11"

[deployment]
run = ["sh", "-c", "npm run build && node server/dist/index.js"]
```

Create `replit.nix`:

```nix
{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.postgresql
  ];
}
```

**Replit-specific notes:**
- Replit auto-provides `DATABASE_URL` for built-in PostgreSQL — never override it in Secrets
- All other secrets go in Replit's Secrets tab (not in a `.env` file)
- Vite dev server port: 5173 — set as the exposed port in Replit's port configuration
- Express server port: 5000 — internal only
- Vite `server.proxy` in `vite.config.ts`: proxy `/api` → `http://localhost:5000`
- Add `"host": "0.0.0.0"` to Vite server config so Replit can expose the frontend

---

## VITE CONFIG

```typescript
// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
```

---

## IMPLEMENTATION ORDER

Build in this exact sequence — do not skip steps:

1. Initialize monorepo — root `package.json`, workspaces, install `concurrently`
2. Scaffold `server/` — TypeScript config, Express app, health check route, Winston logger
3. Connect Prisma to Replit PostgreSQL — run `prisma migrate dev --name init`
4. Implement Firebase Admin SDK init + auth middleware
5. Build all API routes (pets, sightings, updates, uploads, auth/sync)
6. Build AI service using Gemini 1.5 Flash with structured JSON schema
7. Add Socket.io to server — emit on new sighting + AI path update
8. Seed database with sample data
9. Scaffold `client/` — Vite + React + TypeScript + Tailwind + shadcn/ui init
10. Set up Firebase client SDK + AuthContext + AuthModal component
11. Set up Axios instance (auto-inject Firebase ID token) + TanStack Query provider
12. Build shared components: ImageUpload, Timeline, StepIndicator
13. Build map components: PinDropMap, TrackingMap, VerifiedPathLayer, PredictedPathLayer, MapLegend
14. Build Home page — pet feed, filter bar, pet cards, skeletons
15. Build Report Pet page — 3-step form with map pin drop
16. Build Pet Profile page — hero, tabs, Tracker tab with full path map
17. Build Sightings tab — list with flag controls
18. Build Updates tab — timeline + owner post form
19. Build Add Sighting page — single-page form with map
20. Build Owner Dashboard page
21. Connect Socket.io client — real-time map and feed updates
22. Polish: all loading states, empty states, error handling, mobile layout, responsive tweaks
23. Final README with Firebase setup guide, API key instructions, and Replit deployment steps

---

## README MUST INCLUDE

- Project description and feature list
- Architecture diagram (ASCII)
- Step-by-step Firebase project setup (enable Auth, add Google + Facebook providers, create storage bucket)
- Step-by-step Gemini API key setup (Google AI Studio — free, no credit card)
- How to set Replit Secrets
- Database migration command
- Seed command
- How to run locally vs deploy on Replit

---

*PawTrack Build Specification v2*
*Stack: React + TypeScript + Vite + Tailwind + Leaflet/OSM + Express + Prisma + Replit PostgreSQL + Firebase Auth/Storage + Gemini 1.5 Flash*
*Zero paid map services. Zero paid AI services. Minimal external account setup.*
