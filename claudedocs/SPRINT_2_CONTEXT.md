# 🏆 SPRINT 2: Tournaments Engine - Context Document

> **Sprint:** 2 de 6
> **Nombre:** Tournaments Engine
> **Duración estimada:** 10-14 días
> **Branch:** `sprint-2-tournaments`
> **Dependencies:** Sprint 1 (auth, profiles, comms, bookings)

---

## 🎯 Objetivos del Sprint

Implementar el motor completo de torneos con soporte para **Americano** y **Mexicano**, incluyendo:

1. ✅ Database schema completo para torneos
2. ✅ Generador de rondas (Americano + Mexicano)
3. ✅ Sistema de rotación de canchas inteligente
4. ✅ Rotation Board UI con visualización en tiempo real
5. ✅ Check-in con geofencing GPS real
6. ✅ Notificaciones automáticas por ronda (WhatsApp + Email)
7. ✅ Admin Dashboard para gestión de torneos
8. ✅ Export PDF/imagen server-side del rotation board

---

## 📊 Database Schema

### **1. Table: `tournament`**

Información básica del torneo.

```sql
CREATE TABLE tournament (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,

  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('americano', 'mexicano')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'in_progress', 'completed', 'cancelled')),

  -- Timing
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  check_in_opens_at TIMESTAMPTZ,
  check_in_closes_at TIMESTAMPTZ,

  -- Configuration
  max_participants INTEGER NOT NULL,
  match_duration_minutes INTEGER NOT NULL DEFAULT 90,
  points_per_win INTEGER NOT NULL DEFAULT 3,
  points_per_draw INTEGER NOT NULL DEFAULT 1,
  points_per_loss INTEGER NOT NULL DEFAULT 0,

  -- Geofencing
  location_lat DOUBLE PRECISION NOT NULL,
  location_lng DOUBLE PRECISION NOT NULL,
  geofence_radius_meters INTEGER NOT NULL DEFAULT 100,

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb,
  -- settings: { auto_advance_rounds: bool, notify_participants: bool, allow_late_checkin: bool }

  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tournament_org ON tournament(org_id);
CREATE INDEX idx_tournament_status ON tournament(status);
CREATE INDEX idx_tournament_type ON tournament(type);
CREATE INDEX idx_tournament_starts_at ON tournament(starts_at);
CREATE INDEX idx_tournament_location ON tournament USING gist(
  ll_to_earth(location_lat, location_lng)
);
```

### **2. Table: `tournament_participant`**

Participantes inscritos en el torneo.

```sql
CREATE TABLE tournament_participant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Registration
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'checked_in', 'no_show', 'withdrawn')),

  -- Check-in
  checked_in_at TIMESTAMPTZ,
  checked_in_lat DOUBLE PRECISION,
  checked_in_lng DOUBLE PRECISION,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tournament_id, user_id)
);

CREATE INDEX idx_participant_tournament ON tournament_participant(tournament_id);
CREATE INDEX idx_participant_user ON tournament_participant(user_id);
CREATE INDEX idx_participant_status ON tournament_participant(status);
```

### **3. Table: `tournament_round`**

Rondas generadas del torneo.

```sql
CREATE TABLE tournament_round (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,

  -- Round Info
  round_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),

  -- Timing
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tournament_id, round_number)
);

CREATE INDEX idx_round_tournament ON tournament_round(tournament_id);
CREATE INDEX idx_round_status ON tournament_round(status);
```

### **4. Table: `tournament_match`**

Partidos individuales dentro de cada ronda.

```sql
CREATE TABLE tournament_match (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES tournament_round(id) ON DELETE CASCADE,
  court_id UUID REFERENCES court(id) ON DELETE SET NULL,

  -- Teams (Americano: pairs rotate, Mexicano: winners/losers split)
  team1_player1_id UUID NOT NULL REFERENCES auth.users(id),
  team1_player2_id UUID NOT NULL REFERENCES auth.users(id),
  team2_player1_id UUID NOT NULL REFERENCES auth.users(id),
  team2_player2_id UUID NOT NULL REFERENCES auth.users(id),

  -- Scores
  team1_score INTEGER,
  team2_score INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'forfeited')),

  -- Winner calculation
  winner_team INTEGER CHECK (winner_team IN (1, 2)),
  is_draw BOOLEAN DEFAULT FALSE,

  -- Timing
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_match_round ON tournament_match(round_id);
CREATE INDEX idx_match_court ON tournament_match(court_id);
CREATE INDEX idx_match_status ON tournament_match(status);
CREATE INDEX idx_match_players ON tournament_match(team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id);
```

### **5. Table: `tournament_standing`**

Clasificación y estadísticas de cada participante.

```sql
CREATE TABLE tournament_standing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stats
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  matches_drawn INTEGER DEFAULT 0,
  matches_lost INTEGER DEFAULT 0,

  -- Points
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  games_diff INTEGER GENERATED ALWAYS AS (games_won - games_lost) STORED,

  points INTEGER DEFAULT 0,

  -- Ranking (calculated)
  rank INTEGER,

  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tournament_id, user_id)
);

CREATE INDEX idx_standing_tournament ON tournament_standing(tournament_id);
CREATE INDEX idx_standing_points ON tournament_standing(tournament_id, points DESC, games_diff DESC);
CREATE INDEX idx_standing_rank ON tournament_standing(tournament_id, rank);
```

---

## 🔄 Tournament Formats Logic

### **Americano (Round Robin Rotation)**

**Características:**
- Todos los jugadores juegan con todos los jugadores
- Las parejas rotan cada ronda
- Máxima interacción social
- No hay eliminaciones

**Algoritmo de Generación:**
```typescript
// Round 1: (1,2) vs (3,4), (5,6) vs (7,8)
// Round 2: (1,3) vs (2,5), (4,7) vs (6,8)
// Round 3: (1,4) vs (3,6), (2,7) vs (5,8)
// ... pattern continues ensuring all pairs play together
```

**Reglas:**
- Cada jugador debe jugar con todos los demás al menos una vez
- Canchas se asignan equitativamente
- Puntos: Win=3, Draw=1, Loss=0
- Clasificación: Por puntos totales → games diff → head-to-head

### **Mexicano (Winners/Losers Rotation)**

**Características:**
- Ganadores juegan contra ganadores
- Perdedores juegan contra perdedores
- Sistema dinámico basado en resultados
- Más competitivo

**Algoritmo de Generación:**
```typescript
// Round 1: Random pairs
// Round 2: Winners sorted by score → pair 1st+2nd vs 3rd+4th
//          Losers sorted by score → pair bottom players
// Round 3+: Continue pattern based on current standings
```

**Reglas:**
- Ronda 1: Emparejamientos aleatorios
- Rondas siguientes: Emparejamiento basado en clasificación actual
- Top performers juegan juntos (más difícil)
- Bottom performers juegan juntos (chance de recovery)
- Clasificación: Igual que Americano

---

## 🔧 Core Tournament Engine

### **1. Round Generator Service**

**Location:** `src/lib/tournament-engine.ts`

**Functions:**
```typescript
interface TournamentEngine {
  // Generate next round
  generateNextRound(tournamentId: string): Promise<Round>;

  // Assign courts to matches
  assignCourts(roundId: string, courtIds: string[]): Promise<void>;

  // Calculate standings
  updateStandings(tournamentId: string): Promise<void>;

  // Validate tournament can start
  validateTournamentStart(tournamentId: string): Promise<ValidationResult>;
}

// Americano specific
function generateAmericanoRound(
  participants: Participant[],
  roundNumber: number,
  previousMatches: Match[]
): Match[];

// Mexicano specific
function generateMexicanoRound(
  standings: Standing[],
  roundNumber: number
): Match[];

// Court rotation
function rotateCourts(
  matches: Match[],
  courts: Court[],
  rotationStrategy: 'balanced' | 'sequential'
): MatchWithCourt[];
```

**Key Requirements:**
- Ensure no player plays twice in same round
- Maximize court utilization
- Fair rotation (everyone plays on all courts eventually)
- Handle odd number of players (bye system)

---

## 🌐 API Endpoints

### **Tournament CRUD**

#### `POST /api/tournaments`
Create new tournament.

**Request:**
```typescript
{
  name: string;
  description?: string;
  type: 'americano' | 'mexicano';
  starts_at: string; // ISO date
  max_participants: number;
  location_lat: number;
  location_lng: number;
  geofence_radius_meters?: number;
  match_duration_minutes?: number;
  settings?: {
    auto_advance_rounds?: boolean;
    notify_participants?: boolean;
    allow_late_checkin?: boolean;
  };
}
```

**Response:** Tournament object

#### `GET /api/tournaments`
List tournaments with filters.

**Query Params:**
- `org_id`: UUID (required for admins)
- `status`: 'draft' | 'published' | 'in_progress' | 'completed'
- `type`: 'americano' | 'mexicano'
- `starts_after`: ISO date
- `starts_before`: ISO date
- `nearby`: lat,lng,radius_km

**Response:** Paginated tournament list

#### `GET /api/tournaments/[id]`
Get tournament details with participants and current round.

**Response:**
```typescript
{
  tournament: Tournament;
  participants: Participant[];
  current_round?: Round;
  standings: Standing[];
  stats: {
    total_matches: number;
    completed_matches: number;
    progress_percentage: number;
  };
}
```

#### `PUT /api/tournaments/[id]`
Update tournament (only if status='draft').

#### `DELETE /api/tournaments/[id]`
Cancel tournament (soft delete, sets status='cancelled').

---

### **Participation**

#### `POST /api/tournaments/[id]/join`
Join tournament as participant.

**Validations:**
- Tournament is published
- Not at max capacity
- User not already registered
- Registration deadline not passed

**Response:** Participant object

#### `DELETE /api/tournaments/[id]/leave`
Withdraw from tournament.

**Validations:**
- Tournament hasn't started
- User is registered

#### `POST /api/tournaments/[id]/check-in`
Check-in for tournament with GPS validation.

**Request:**
```typescript
{
  lat: number;
  lng: number;
}
```

**Validations:**
- Check-in window is open
- User is registered
- Location within geofence radius
- Not already checked in

**Response:** Updated participant with `checked_in_at`

---

### **Round Management**

#### `POST /api/tournaments/[id]/start`
Start tournament and generate first round.

**Validations:**
- Tournament is published
- Minimum participants met (e.g., 8+)
- Check-in period closed
- No existing rounds

**Actions:**
- Set status = 'in_progress'
- Generate Round 1 based on type (Americano/Mexicano)
- Assign courts
- Send notifications to all participants

**Response:** Generated round with matches

#### `GET /api/tournaments/[id]/rounds/current`
Get current active round with matches and court assignments.

**Response:**
```typescript
{
  round: Round;
  matches: MatchWithDetails[];
  rotation_board: {
    court_id: string;
    court_name: string;
    match: {
      team1: [Player, Player];
      team2: [Player, Player];
      status: string;
    };
  }[];
}
```

#### `POST /api/rounds/[roundId]/matches/[matchId]/score`
Submit match score.

**Request:**
```typescript
{
  team1_score: number;
  team2_score: number;
}
```

**Validations:**
- Round is in_progress
- Match belongs to round
- User is admin or one of the players
- Scores are valid (0-99)

**Actions:**
- Update match scores
- Calculate winner
- Update standings
- If all matches completed → auto-advance round

**Response:** Updated match

#### `POST /api/rounds/[roundId]/complete`
Manually complete round and generate next.

**Validations:**
- All matches have scores
- User is admin

**Actions:**
- Set round status = 'completed'
- Update standings
- Generate next round (if tournament not finished)
- Send notifications

**Response:** Next round (or final standings if tournament complete)

---

### **Standings**

#### `GET /api/tournaments/[id]/standings`
Get current standings sorted by rank.

**Response:**
```typescript
Standing[] // sorted by points desc, games_diff desc
```

---

### **Admin Dashboard**

#### `GET /api/admin/tournaments/dashboard`
Get tournament management overview.

**Response:**
```typescript
{
  active_tournaments: Tournament[];
  upcoming_tournaments: Tournament[];
  stats: {
    total_tournaments: number;
    active_participants: number;
    completed_matches_today: number;
  };
}
```

#### `GET /api/tournaments/[id]/admin`
Get detailed admin view of tournament.

**Response:**
```typescript
{
  tournament: Tournament;
  participants: ParticipantWithProfile[];
  all_rounds: Round[];
  all_matches: Match[];
  standings: Standing[];
  issues: {
    missing_scores: Match[];
    overdue_matches: Match[];
    no_shows: Participant[];
  };
}
```

---

### **Export**

#### `GET /api/tournaments/[id]/export/rotation-board`
Generate PDF/PNG of rotation board.

**Query Params:**
- `format`: 'pdf' | 'png'
- `round_number`: number (optional, defaults to current)

**Actions:**
- Generate rotation board layout server-side
- Use library like `puppeteer` or `sharp` for rendering
- Return file as download

**Response:** File download (PDF or PNG)

---

## 🎨 UI Components

### **1. Rotation Board (`/tournaments/[id]/board`)**

**Features:**
- Real-time display of current round
- Grid layout showing all courts
- Each court shows:
  - Court name
  - Team 1 vs Team 2 (with player names & avatars)
  - Current score (if match started)
  - Status badge (Pending/In Progress/Completed)
- Auto-refresh every 30s
- Manual refresh button

**Component Structure:**
```typescript
<RotationBoard>
  <RoundHeader roundNumber={1} totalRounds={7} />
  <CourtGrid>
    <CourtCard court={court} match={match}>
      <Team1 players={[p1, p2]} score={team1Score} />
      <VSIndicator />
      <Team2 players={[p3, p4]} score={team2Score} />
      <StatusBadge status={status} />
    </CourtCard>
  </CourtGrid>
  <StandingsPreview topPlayers={top5} />
</RotationBoard>
```

**Styles:**
- Responsive grid (1 col mobile, 2 cols tablet, 3+ cols desktop)
- Color-coded status: Gray=pending, Green=in progress, Blue=completed
- Smooth transitions when scores update

---

### **2. Tournament List (`/tournaments`)**

**Features:**
- Filterable list (upcoming, in-progress, my tournaments)
- Tournament cards with:
  - Name, type badge, date, location
  - Participants count (8/16)
  - Status badge
  - CTA button (Join/View/Check-in)

---

### **3. Tournament Detail (`/tournaments/[id]`)**

**Features:**
- Tournament header (name, description, countdown)
- Tabs:
  - **Overview**: Details, rules, location map
  - **Participants**: List with check-in status
  - **Standings**: Live leaderboard
  - **Rotation Board**: Current round visualization
- Action buttons:
  - Join/Leave (if user not registered)
  - Check-in (if window open and registered)
  - View board (always visible)

---

### **4. Admin Tournament Management (`/admin/tournaments/[id]`)**

**Features:**
- Tournament settings form
- Participant management:
  - Add/remove manually
  - Force check-in
  - Mark as no-show
- Round controls:
  - Start tournament
  - Complete current round
  - Generate next round
  - Edit match scores
- Export options:
  - Download rotation board (PDF/PNG)
  - Export standings (CSV)
  - Full tournament report

---

## 📍 Geofencing Implementation

### **GPS Validation Flow**

1. User clicks "Check-in" button
2. Request browser geolocation permission
3. Get current position (lat, lng)
4. Send to API: `POST /api/tournaments/[id]/check-in`
5. Server validates:
   - Calculate distance from tournament location
   - Check if within `geofence_radius_meters`
   - Use Haversine formula or PostGIS
6. If valid: Mark as checked_in
7. If invalid: Return error with distance

### **Client-Side Geolocation**

```typescript
// src/lib/geolocation.ts
async function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}
```

### **Server-Side Distance Calculation**

```typescript
// src/lib/geofencing.ts
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Haversine formula
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

function isWithinGeofence(
  userLat: number,
  userLng: number,
  targetLat: number,
  targetLng: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(userLat, userLng, targetLat, targetLng);
  return distance <= radiusMeters;
}
```

---

## 📧 Notifications System

### **Notification Triggers**

| Event | Recipients | Channel | Template |
|-------|-----------|---------|----------|
| Tournament published | Org members | Email | `tournament-published` |
| Registration confirmed | Participant | Email + WhatsApp | `registration-confirmed` |
| Check-in opens | All registered | WhatsApp | `check-in-reminder` |
| Tournament starts | All checked-in | WhatsApp + Email | `tournament-started` |
| Round starts | Match participants | WhatsApp | `round-started` |
| Match assigned | 4 players | WhatsApp | `match-assignment` |
| Score submitted | 4 players | WhatsApp | `match-completed` |
| Tournament ends | All participants | Email | `tournament-ended` |

### **Implementation**

**Notification Service:**
```typescript
// src/lib/notifications/tournament.ts
async function notifyTournamentStart(tournament: Tournament) {
  const participants = await getCheckedInParticipants(tournament.id);

  // WhatsApp bulk send
  await Promise.all(
    participants.map(p =>
      sendWhatsApp(
        p.phone,
        `🏆 ${tournament.name} is starting! Check your first match on the rotation board.`
      )
    )
  );

  // Email backup
  await sendBulkEmail({
    to: participants.map(p => p.email),
    template: 'tournament-started',
    data: { tournament },
  });
}

async function notifyMatchStart(match: Match, round: Round) {
  const players = await getMatchPlayers(match.id);

  const message = `
🎾 Your match is starting!
Round ${round.round_number}
Court: ${match.court.name}
Opponents: ${players[2].name} & ${players[3].name}
Good luck!
  `.trim();

  await Promise.all(
    players.slice(0, 4).map(p => sendWhatsApp(p.phone, message))
  );
}
```

---

## 📄 Export System

### **Server-Side PDF Generation**

**Library:** `puppeteer` (headless Chrome)

**Flow:**
1. Render rotation board HTML template with data
2. Use Puppeteer to load HTML
3. Generate PDF/PNG from page
4. Stream to client as download

**Implementation:**
```typescript
// src/lib/export/rotation-board.ts
import puppeteer from 'puppeteer';

async function exportRotationBoard(
  tournamentId: string,
  roundNumber: number,
  format: 'pdf' | 'png'
): Promise<Buffer> {
  const data = await getRotationBoardData(tournamentId, roundNumber);
  const html = renderRotationBoardHTML(data);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(html);
  await page.setViewport({ width: 1920, height: 1080 });

  let buffer: Buffer;

  if (format === 'pdf') {
    buffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
    });
  } else {
    buffer = await page.screenshot({
      fullPage: true,
      type: 'png',
    });
  }

  await browser.close();

  return buffer;
}

function renderRotationBoardHTML(data: RotationBoardData): string {
  // Generate styled HTML with Tailwind classes
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-50 p-8">
        <div class="max-w-6xl mx-auto">
          <h1 class="text-4xl font-bold mb-8">${data.tournament.name}</h1>
          <h2 class="text-2xl mb-4">Round ${data.round.round_number}</h2>
          <div class="grid grid-cols-3 gap-6">
            ${data.matches.map(renderMatchCard).join('')}
          </div>
        </div>
      </body>
    </html>
  `;
}
```

**Dependencies:**
```bash
npm install puppeteer
```

---

## ✅ Acceptance Criteria

### **Database & Migrations**
- [ ] All 5 tables created with correct schema
- [ ] RLS policies for tournament CRUD (org members only)
- [ ] RLS policies for participant operations (own records + admins)
- [ ] Triggers for standings auto-update on match completion
- [ ] Indexes for performance (location, status, queries)

### **Tournament Engine**
- [ ] Americano generator creates valid pairings (no repeats in round)
- [ ] Mexicano generator pairs by standings correctly
- [ ] Court rotation is balanced across all courts
- [ ] Standings calculation is accurate (points, games diff, rank)
- [ ] Odd number of players handled (bye system)

### **APIs**
- [ ] All 15+ endpoints implemented and documented
- [ ] Proper validation and error handling
- [ ] Admin permissions enforced
- [ ] TypeScript types for all requests/responses

### **UI Components**
- [ ] Rotation board displays correctly on mobile/desktop
- [ ] Real-time updates (auto-refresh or websockets)
- [ ] Tournament list filterable and searchable
- [ ] Admin dashboard functional with all controls

### **Geofencing**
- [ ] GPS permission requested correctly
- [ ] Distance calculation accurate (tested with real coords)
- [ ] Check-in only allowed within geofence
- [ ] Clear error messages when out of range

### **Notifications**
- [ ] All 8 notification triggers working
- [ ] WhatsApp messages sent via Twilio
- [ ] Email fallback via Resend
- [ ] Bulk sending optimized (no rate limits hit)

### **Export**
- [ ] PDF generation works for rotation board
- [ ] PNG generation works for rotation board
- [ ] Export for specific round number
- [ ] File downloads correctly in browser

### **Testing**
- [ ] Unit tests for tournament engine (Americano/Mexicano logic)
- [ ] API tests for all endpoints
- [ ] Integration tests for round flow (start → scores → next)
- [ ] >70% coverage of critical paths

---

## 🔗 Dependencies

### **From Sprint 1:**
- `auth.users` (participant identities)
- `user_profile` (names, avatars for display)
- `organization` (tournament ownership)
- `org_member` (admin permissions)
- `court` (court assignments for matches)
- Twilio service (WhatsApp notifications)
- Resend service (Email notifications)

### **New Dependencies:**
```bash
npm install puppeteer      # For PDF/PNG export
npm install @turf/turf     # (Optional) Advanced geospatial if needed
```

---

## 📝 Notes for BMAD Agents

### **For @sm (Scrum Master):**
Break this down into **~20 user stories**:
- 3-4 stories for database setup
- 5-6 stories for engine logic (Americano, Mexicano, court rotation)
- 6-8 stories for API endpoints (CRUD, rounds, scores)
- 3-4 stories for UI components (board, list, detail, admin)
- 2-3 stories for notifications & geofencing
- 1-2 stories for export & testing

### **For @dev (Developer):**
- Follow existing patterns from Sprint 1
- Use Zod for validation schemas
- Create tests alongside implementation
- Document complex algorithms (especially Americano/Mexicano logic)
- Use TypeScript strict mode

### **For @qa (Quality Assurance):**
- Validate tournament flows end-to-end
- Test edge cases (odd players, tie scores, no courts)
- Test geofencing with mock coordinates
- Verify notifications are sent
- Check PDF/PNG generation quality

### **For @architect:**
- Review engine algorithms before implementation
- Ensure scalability for 50+ participant tournaments
- Consider websockets for real-time board updates (future)
- Database query optimization for standings

---

## 🚀 Ready to Start!

**Next Step:** Run `@sm` to create user stories from this context.

**Expected Output:** ~20 user stories ready for implementation with `@dev`.

*Created: 2025-10-17*
*For: PadelGraph Sprint 2*
*Branch: sprint-2-tournaments*
