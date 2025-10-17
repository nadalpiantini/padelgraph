# 🏆 SPRINT 3: Advanced Tournament Formats - Context Document

> **Sprint:** 3 de 6
> **Nombre:** Advanced Tournament Formats
> **Duración estimada:** 8-10 días
> **Branch:** `sprint-3-advanced-formats`
> **Dependencies:** Sprint 2 (tournament engine, Americano/Mexicano)

---

## 🎯 Objetivos del Sprint

Expandir el motor de torneos con formatos avanzados y profesionales:

1. ✅ Round Robin completo (todos contra todos)
2. ✅ Knockout/Eliminación Directa (single/double elimination)
3. ✅ Swiss System (emparejamiento dinámico)
4. ✅ Monrad System (híbrido Swiss-Knockout)
5. ✅ Compass Draw (consolation brackets)
6. ✅ Brackets Visualization UI
7. ✅ Fair-Play System (conduct, penalties)
8. ✅ Multi-Tournament Admin Dashboard

---

## 📊 Enhanced Database Schema

### **1. Update Table: `tournament`**

Add support for new formats.

```sql
-- Add new tournament types
ALTER TABLE tournament
  DROP CONSTRAINT tournament_type_check;

ALTER TABLE tournament
  ADD CONSTRAINT tournament_type_check
  CHECK (type IN (
    'americano',
    'mexicano',
    'round_robin',
    'knockout_single',
    'knockout_double',
    'swiss',
    'monrad',
    'compass'
  ));

-- Add format-specific settings
ALTER TABLE tournament
  ADD COLUMN format_settings JSONB DEFAULT '{}'::jsonb;

-- format_settings examples:
-- Round Robin: { groups: 2, top_per_group: 2, playoffs: true }
-- Knockout: { seeding: 'random'|'ranked', bronze_match: true }
-- Swiss: { rounds: 5, pairing_method: 'slide'|'fold' }
-- Monrad: { initial_rounds: 3, bracket_size: 8 }

CREATE INDEX idx_tournament_format_settings ON tournament USING gin(format_settings);
```

### **2. New Table: `tournament_bracket`**

For knockout-style tournaments.

```sql
CREATE TABLE tournament_bracket (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,

  -- Bracket Info
  bracket_type TEXT NOT NULL CHECK (bracket_type IN ('main', 'consolation', 'third_place')),
  round_number INTEGER NOT NULL,
  position INTEGER NOT NULL, -- Position in bracket (1=top, 2=second, etc)

  -- Match reference
  match_id UUID REFERENCES tournament_match(id) ON DELETE SET NULL,

  -- Parent matches (for progression)
  winner_from_match_id UUID REFERENCES tournament_match(id),
  loser_from_match_id UUID REFERENCES tournament_match(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tournament_id, bracket_type, round_number, position)
);

CREATE INDEX idx_bracket_tournament ON tournament_bracket(tournament_id);
CREATE INDEX idx_bracket_match ON tournament_bracket(match_id);
```

### **3. New Table: `tournament_group`**

For round robin group stages.

```sql
CREATE TABLE tournament_group (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,

  -- Group Info
  group_name TEXT NOT NULL, -- 'A', 'B', 'C', etc
  group_number INTEGER NOT NULL,

  -- Participants in this group
  participant_ids UUID[] NOT NULL,

  -- Settings
  top_advance INTEGER DEFAULT 2, -- How many advance to playoffs

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tournament_id, group_number)
);

CREATE INDEX idx_group_tournament ON tournament_group(tournament_id);
```

### **4. New Table: `tournament_fair_play`**

Track conduct and penalties.

```sql
CREATE TABLE tournament_fair_play (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES tournament_match(id) ON DELETE SET NULL,

  -- Incident
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'yellow_card',
    'red_card',
    'code_violation',
    'time_violation',
    'unsportsmanlike_conduct',
    'equipment_abuse',
    'positive_conduct'
  )),
  description TEXT,
  severity INTEGER CHECK (severity BETWEEN 1 AND 5),

  -- Points impact
  penalty_points INTEGER DEFAULT 0,
  bonus_points INTEGER DEFAULT 0,

  -- Issued by
  issued_by UUID REFERENCES auth.users(id),
  issued_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fairplay_tournament ON tournament_fair_play(tournament_id);
CREATE INDEX idx_fairplay_user ON tournament_fair_play(user_id);
CREATE INDEX idx_fairplay_match ON tournament_fair_play(match_id);
```

### **5. Update Table: `tournament_standing`**

Add fair-play tracking.

```sql
ALTER TABLE tournament_standing
  ADD COLUMN fair_play_points INTEGER DEFAULT 0,
  ADD COLUMN yellow_cards INTEGER DEFAULT 0,
  ADD COLUMN red_cards INTEGER DEFAULT 0,
  ADD COLUMN conduct_bonus INTEGER DEFAULT 0;

-- Update ranking to consider fair-play
-- Ranking: points DESC, games_diff DESC, fair_play_points DESC, head_to_head
```

---

## 🎮 Tournament Format Specifications

### **1. Round Robin (Todos contra Todos)**

**Características:**
- Cada jugador/pareja juega contra todos los demás
- No hay eliminación, todos juegan todas las rondas
- Clasificación final por puntos acumulados
- Opción de grupos + playoffs

**Variantes:**
- **Simple:** Un solo grupo, ranking final directo
- **Con Grupos:** Múltiples grupos, top N avanzan a playoffs
- **Con Playoffs:** Semifinales y final con top clasificados

**Algoritmo:**
```typescript
function generateRoundRobin(participants: User[]): Round[] {
  const rounds: Round[] = [];
  const n = participants.length;
  
  if (n % 2 !== 0) {
    participants.push(null); // BYE
  }
  
  // Circle method algorithm
  for (let round = 0; round < n - 1; round++) {
    const matches: Match[] = [];
    
    for (let i = 0; i < n / 2; i++) {
      if (participants[i] && participants[n - 1 - i]) {
        matches.push({
          team1: [participants[i]],
          team2: [participants[n - 1 - i]]
        });
      }
    }
    
    rounds.push({ round_number: round + 1, matches });
    
    // Rotate (keep first player fixed)
    participants.splice(1, 0, participants.pop());
  }
  
  return rounds;
}
```

---

### **2. Knockout/Eliminación Directa**

**Características:**
- Formato de brackets/llaves
- Pierdes = eliminado
- Requiere potencia de 2 participantes (4, 8, 16, 32, 64)
- BYEs automáticos si no es potencia exacta

**Variantes:**
- **Single Elimination:** Una derrota = fuera
- **Double Elimination:** Dos brackets (winners + losers)
- **Con Final de 3er Puesto:** Semifinalistas perdedores juegan por el bronce

**Algoritmo Single Elimination:**
```typescript
function generateKnockoutBracket(participants: User[]): Bracket {
  // Round to next power of 2
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(participants.length)));
  const byes = bracketSize - participants.length;
  
  // Seed participants (1 vs bracketSize, 2 vs bracketSize-1, etc)
  const seeded = seedParticipants(participants, bracketSize);
  
  const rounds: Round[] = [];
  let currentParticipants = seeded;
  let roundNum = 1;
  
  while (currentParticipants.length > 1) {
    const matches: Match[] = [];
    
    for (let i = 0; i < currentParticipants.length; i += 2) {
      if (currentParticipants[i] && currentParticipants[i + 1]) {
        matches.push({
          team1: [currentParticipants[i]],
          team2: [currentParticipants[i + 1]],
          bracket_position: i / 2
        });
      } else if (currentParticipants[i]) {
        // BYE - auto advance
        matches.push({
          team1: [currentParticipants[i]],
          team2: null,
          winner_team: 1
        });
      }
    }
    
    rounds.push({ 
      round_number: roundNum++, 
      round_name: getRoundName(currentParticipants.length),
      matches 
    });
    
    currentParticipants = currentParticipants.slice(0, Math.floor(currentParticipants.length / 2));
  }
  
  return { rounds, bracket_size: bracketSize };
}

function getRoundName(remaining: number): string {
  const names = {
    2: 'Final',
    4: 'Semifinales',
    8: 'Cuartos de Final',
    16: 'Octavos de Final'
  };
  return names[remaining] || `Ronda de ${remaining}`;
}
```

**Double Elimination:**
```typescript
function generateDoubleEliminationBracket(participants: User[]): {
  winners: Bracket;
  losers: Bracket;
} {
  const winners = generateKnockoutBracket(participants);
  
  // Losers bracket receives losers from winners bracket
  const losers: Round[] = [];
  
  // Complex losers bracket routing (crossover pattern)
  // Losers play in parallel, eventual winner plays winners bracket finalist
  
  return { winners, losers };
}
```

---

### **3. Swiss System**

**Características:**
- Número fijo de rondas (generalmente 5-7)
- No hay eliminación
- Emparejamiento dinámico: misma cantidad de victorias juegan entre sí
- Evita repeticiones de enfrentamientos
- Popular en ajedrez y torneos grandes

**Algoritmo:**
```typescript
function generateSwissRound(
  standings: Standing[],
  roundNumber: number,
  previousMatches: Match[]
): Match[] {
  // Group by same score
  const scoreGroups = groupBy(standings, s => s.points);
  
  const matches: Match[] = [];
  
  for (const group of Object.values(scoreGroups)) {
    // Sort by rating/tiebreakers
    const sorted = sortByTiebreakers(group);
    
    // Pair sequentially (1 vs 2, 3 vs 4, etc) - "Slide" method
    // Or (1 vs n/2+1, 2 vs n/2+2, etc) - "Fold" method
    
    for (let i = 0; i < sorted.length; i += 2) {
      if (sorted[i] && sorted[i + 1]) {
        // Avoid repeat pairings
        if (!hasPlayedBefore(sorted[i], sorted[i + 1], previousMatches)) {
          matches.push({
            team1: [sorted[i].user],
            team2: [sorted[i + 1].user]
          });
        } else {
          // Try next available opponent
          const alternative = findAlternativeOpponent(sorted[i], sorted.slice(i + 2), previousMatches);
          if (alternative) {
            matches.push({
              team1: [sorted[i].user],
              team2: [alternative.user]
            });
          }
        }
      }
    }
  }
  
  return matches;
}
```

**Swiss Pairing Methods:**
- **Slide:** Top half vs bottom half
- **Fold:** Adjacent pairing (1v2, 3v4, 5v6)
- **Accelerated Swiss:** Spread high-ranked players early
- **Monrad:** Hybrid with bracket progression

---

### **4. Monrad System**

**Características:**
- Híbrido Swiss + Knockout
- Primeras N rondas: Swiss
- Últimas rondas: Bracket knockout basado en clasificación Swiss
- Combina lo mejor de ambos sistemas

**Algoritmo:**
```typescript
function generateMonradTournament(
  participants: User[],
  settings: { initialRounds: number; finalBracketSize: number }
): Tournament {
  // Phase 1: Swiss rounds
  const swissRounds = [];
  for (let i = 1; i <= settings.initialRounds; i++) {
    swissRounds.push(generateSwissRound(standings, i, previousMatches));
  }
  
  // Phase 2: Top N to knockout bracket
  const finalStandings = calculateStandings(swissRounds);
  const topPlayers = finalStandings.slice(0, settings.finalBracketSize);
  
  const knockoutBracket = generateKnockoutBracket(topPlayers);
  
  return {
    phase1: swissRounds,
    phase2: knockoutBracket
  };
}
```

---

### **5. Compass Draw**

**Características:**
- Knockout principal + consolation brackets
- Perdedores de cada ronda van a bracket de consolación
- Múltiples "finales" para diferentes niveles
- Garantiza múltiples partidos para todos

**Estructura:**
```
Main Draw (Winners)
├── Round 1 Winners → Round 2 (Main)
└── Round 1 Losers → East Consolation

East Consolation
├── Winners → North-East
└── Losers → South-East

(Similar para West, North-West, South-West, etc)
```

**Algoritmo:**
```typescript
function generateCompassDraw(participants: User[]): CompassBracket {
  const mainDraw = generateKnockoutBracket(participants);
  
  const consolationBrackets = {
    east: [],
    west: [],
    northEast: [],
    southEast: [],
    northWest: [],
    southWest: []
  };
  
  // Route losers from main draw to appropriate consolation
  mainDraw.rounds.forEach((round, idx) => {
    round.matches.forEach(match => {
      if (match.winner_team === 1) {
        routeLoser(match.team2, getConsolationBracket(idx, 'first'));
      } else {
        routeLoser(match.team1, getConsolationBracket(idx, 'first'));
      }
    });
  });
  
  return { mainDraw, consolationBrackets };
}
```

---

## 🎨 UI Components

### **1. Tournament Format Selector**

When creating tournament, admin selects format:

```typescript
<TournamentFormatSelector>
  <FormatCard type="round_robin">
    <Icon>🔄</Icon>
    <Title>Round Robin</Title>
    <Description>Everyone plays everyone. Fair and complete.</Description>
    <BestFor>Social tournaments, leagues</BestFor>
  </FormatCard>
  
  <FormatCard type="knockout_single">
    <Icon>🏆</Icon>
    <Title>Single Elimination</Title>
    <Description>Win or go home. Fast and exciting.</Description>
    <BestFor>Championship events, time-limited</BestFor>
  </FormatCard>
  
  <FormatCard type="swiss">
    <Icon>⚖️</Icon>
    <Title>Swiss System</Title>
    <Description>Fixed rounds, no elimination. Fair ranking.</Description>
    <BestFor>Large tournaments, competitive</BestFor>
  </FormatCard>
  
  {/* ... more formats */}
</TournamentFormatSelector>
```

---

### **2. Bracket Visualization Component**

Interactive bracket display for knockout tournaments.

```typescript
<BracketVisualization tournament={tournament}>
  <BracketHeader>
    <Title>{tournament.name}</Title>
    <FormatBadge>{tournament.type}</FormatBadge>
  </BracketHeader>
  
  <BracketContainer layout="horizontal|vertical">
    <BracketColumn round={1} name="Round of 16">
      <BracketMatch position={0}>
        <Team winner={true}>Player A</Team>
        <Score>6-3</Score>
        <Team>Player B</Team>
      </BracketMatch>
      {/* ... 8 matches */}
    </BracketColumn>
    
    <BracketColumn round={2} name="Quarterfinals">
      {/* ... 4 matches */}
    </BracketColumn>
    
    <BracketColumn round={3} name="Semifinals">
      {/* ... 2 matches */}
    </BracketColumn>
    
    <BracketColumn round={4} name="Final">
      <ChampionshipMatch />
    </BracketColumn>
  </BracketContainer>
  
  <BracketLegend>
    <LegendItem color="green">Winner</LegendItem>
    <LegendItem color="gray">TBD</LegendItem>
    <LegendItem color="blue">In Progress</LegendItem>
  </BracketLegend>
</BracketVisualization>
```

**Libraries:**
- `react-tournament-bracket` - Pre-built bracket component
- Or custom SVG/Canvas rendering

---

### **3. Group Stage Standings Table**

For Round Robin with groups.

```typescript
<GroupStageStandings tournament={tournament}>
  <GroupTabs>
    <Tab active>Group A</Tab>
    <Tab>Group B</Tab>
    <Tab>Group C</Tab>
  </GroupTabs>
  
  <StandingsTable group="A">
    <thead>
      <tr>
        <th>Rank</th>
        <th>Player</th>
        <th>W-D-L</th>
        <th>Games</th>
        <th>Diff</th>
        <th>Points</th>
      </tr>
    </thead>
    <tbody>
      <StandingRow rank={1} qualified={true}>
        <td>1</td>
        <td>Player Name</td>
        <td>5-1-0</td>
        <td>30-18</td>
        <td>+12</td>
        <td>16</td>
      </StandingRow>
      {/* ... */}
    </tbody>
  </StandingsTable>
  
  <AdvancementInfo>
    Top 2 advance to knockout stage
  </AdvancementInfo>
</GroupStageStandings>
```

---

### **4. Fair-Play Tracking Panel**

Admin tool to issue cards and track conduct.

```typescript
<FairPlayPanel tournament={tournament}>
  <PlayerSearch>
    <Input placeholder="Search player..." />
  </PlayerSearch>
  
  <IncidentForm>
    <Select name="incident_type">
      <option>Yellow Card</option>
      <option>Red Card</option>
      <option>Code Violation</option>
      <option>Positive Conduct</option>
    </Select>
    
    <Textarea placeholder="Description..." />
    
    <Select name="severity">
      <option>1 - Minor</option>
      <option>3 - Moderate</option>
      <option>5 - Severe</option>
    </Select>
    
    <Input type="number" placeholder="Penalty points" />
    
    <Button>Issue Incident</Button>
  </IncidentForm>
  
  <RecentIncidents>
    <IncidentCard type="yellow_card">
      <Player>John Doe</Player>
      <Description>Ball abuse</Description>
      <Penalty>-2 points</Penalty>
      <Time>5 min ago</Time>
    </IncidentCard>
  </RecentIncidents>
</FairPlayPanel>
```

---

## 🌐 API Endpoints

### **Format-Specific Generation**

#### `POST /api/tournaments/[id]/generate/round-robin`
Generate all round-robin matches.

**Request:**
```typescript
{
  groups?: number; // If > 1, create group stage
  top_per_group?: number; // Advance to playoffs
  include_playoffs?: boolean;
}
```

**Response:** All rounds with matches

---

#### `POST /api/tournaments/[id]/generate/knockout`
Generate knockout bracket.

**Request:**
```typescript
{
  elimination_type: 'single' | 'double';
  seeding: 'random' | 'ranked' | 'manual';
  seed_order?: string[]; // User IDs in seed order
  bronze_match?: boolean;
}
```

**Response:** Bracket structure with TBD matches

---

#### `POST /api/tournaments/[id]/generate/swiss`
Generate Swiss system rounds.

**Request:**
```typescript
{
  total_rounds: number;
  pairing_method: 'slide' | 'fold' | 'accelerated';
}
```

**Response:** First round (others generated after each completion)

---

### **Bracket Management**

#### `GET /api/tournaments/[id]/bracket`
Get full bracket structure.

**Response:**
```typescript
{
  bracket_type: string;
  rounds: BracketRound[];
  progression_map: {
    match_id: string;
    winner_advances_to: string;
    loser_advances_to?: string; // Double elimination
  }[];
}
```

---

#### `PUT /api/brackets/[bracketId]/advance`
Advance winner to next round (auto after score submit).

**Request:**
```typescript
{
  match_id: string;
  winner_user_id: string;
}
```

**Actions:**
- Find next bracket position
- Create/update next match with winner
- Update bracket progression

---

### **Fair-Play System**

#### `POST /api/tournaments/[id]/fair-play`
Issue fair-play incident.

**Request:**
```typescript
{
  user_id: string;
  match_id?: string;
  incident_type: 'yellow_card' | 'red_card' | ...;
  description: string;
  severity: 1-5;
  penalty_points?: number;
}
```

**Actions:**
- Create fair_play record
- Update user's standing (penalty/bonus points)
- Send notification to player
- Log in tournament activity

---

#### `GET /api/tournaments/[id]/fair-play`
Get all fair-play incidents.

**Response:** List of incidents with player info

---

## 🔧 Enhanced Tournament Engine

### **Universal Format Handler**

```typescript
// src/lib/tournament-engine/index.ts
export class UniversalTournamentEngine {
  async generateTournament(
    tournament: Tournament,
    participants: User[]
  ): Promise<GenerationResult> {
    
    const generator = this.getGeneratorForType(tournament.type);
    
    const result = await generator.generate(participants, tournament.format_settings);
    
    return result;
  }
  
  private getGeneratorForType(type: TournamentType) {
    const generators = {
      'round_robin': new RoundRobinGenerator(),
      'knockout_single': new SingleEliminationGenerator(),
      'knockout_double': new DoubleEliminationGenerator(),
      'swiss': new SwissSystemGenerator(),
      'monrad': new MonradGenerator(),
      'compass': new CompassDrawGenerator(),
      'americano': new AmericanoGenerator(), // From Sprint 2
      'mexicano': new MexicanoGenerator(), // From Sprint 2
    };
    
    return generators[type];
  }
}

interface TournamentGenerator {
  generate(participants: User[], settings: any): Promise<GenerationResult>;
  generateNextRound(tournament: Tournament, standings: Standing[]): Promise<Round>;
  validateCompletion(tournament: Tournament): Promise<boolean>;
}
```

---

### **Bracket Progression Service**

```typescript
// src/lib/tournament-engine/bracket-progression.ts
export class BracketProgressionService {
  async advanceWinner(match: Match, winnerUserId: string) {
    const bracket = await this.findBracketPosition(match.id);
    
    if (!bracket) return; // No progression (final match)
    
    const nextMatch = await this.getOrCreateNextMatch(bracket);
    
    // Assign winner to correct position in next match
    if (bracket.winner_from_match_id === match.id) {
      await this.assignTeam(nextMatch.id, winnerUserId, 'team1');
    }
    
    // If double elimination, route loser
    if (bracket.loser_advances_to) {
      const loserMatch = await this.getOrCreateLoserMatch(bracket);
      const loserId = match.team1_player1_id === winnerUserId 
        ? match.team2_player1_id 
        : match.team1_player1_id;
      await this.assignTeam(loserMatch.id, loserId, 'team1');
    }
  }
}
```

---

## ✅ Acceptance Criteria

### **Database & Schema**
- [ ] `tournament` table supports all 8 formats
- [ ] `tournament_bracket` table for knockout progression
- [ ] `tournament_group` table for round robin groups
- [ ] `tournament_fair_play` table for conduct tracking
- [ ] Standings updated with fair-play points
- [ ] All indexes created for performance

### **Tournament Generators**
- [ ] Round Robin generator (single group)
- [ ] Round Robin with groups + playoffs
- [ ] Single Elimination bracket (with BYEs)
- [ ] Double Elimination (winners + losers bracket)
- [ ] Swiss System (5-7 rounds, proper pairing)
- [ ] Monrad hybrid system
- [ ] Compass Draw consolation brackets
- [ ] All generators tested with 8, 16, 32, 64 participants

### **Bracket System**
- [ ] Bracket visualization component (SVG/Canvas)
- [ ] Automatic winner advancement
- [ ] BYE handling in brackets
- [ ] Third-place match support
- [ ] Progression mapping (winner/loser routing)

### **Fair-Play System**
- [ ] Incident creation API
- [ ] Yellow/red card tracking
- [ ] Penalty points deduction from standings
- [ ] Positive conduct bonus points
- [ ] Fair-play admin panel UI
- [ ] Notifications for incidents

### **UI Components**
- [ ] Format selector in tournament creation
- [ ] Bracket visualization (responsive)
- [ ] Group standings tables
- [ ] Fair-play incident panel
- [ ] Multi-format tournament dashboard

### **API Endpoints**
- [ ] All format-specific generation endpoints
- [ ] Bracket management endpoints
- [ ] Fair-play CRUD endpoints
- [ ] Admin override tools (manual seeding, progression)

### **Testing**
- [ ] Unit tests for each generator
- [ ] Integration tests for bracket progression
- [ ] E2E tests for complete tournament flows
- [ ] Edge cases: odd participants, ties, BYEs
- [ ] >75% coverage of tournament engine

---

## 🔗 Dependencies

### **From Sprint 2:**
- Tournament base schema (tournament, participant, round, match, standing)
- Americano/Mexicano generators (remain functional)
- Notification system (Twilio + Resend)
- Admin dashboard foundation
- Court assignment logic

### **New Dependencies:**
```bash
npm install react-tournament-bracket  # For bracket visualization
npm install @visx/hierarchy           # For tree/bracket layouts (alternative)
```

---

## 📊 Tournament Format Comparison

| Format | Participants | Rounds | Elimination | Best For |
|--------|--------------|--------|-------------|----------|
| **Americano** | 8-32 | N-1 | None | Social, rotation |
| **Mexicano** | 8-32 | 5-10 | None | Competitive social |
| **Round Robin** | 4-16 | N-1 | None | Fair ranking, leagues |
| **Knockout Single** | 4-64 | log2(N) | Yes | Championships, fast |
| **Knockout Double** | 4-32 | ~2*log2(N) | Yes | Competitive, second chances |
| **Swiss** | 8-128 | 5-7 | None | Large, competitive |
| **Monrad** | 16-64 | 6-8 | Partial | Hybrid competitive |
| **Compass** | 8-32 | Varies | Consolation | Everyone plays multiple |

---

## 📝 Notes for BMAD Agents

### **For @sm (Scrum Master):**
Break into **~25 user stories**:
- 4 stories: Database schema updates
- 8 stories: Tournament generators (one per format)
- 4 stories: Bracket system
- 3 stories: Fair-play system
- 4 stories: UI components
- 2 stories: API endpoints
- 2 stories: Testing & documentation

### **For @dev (Developer):**
- Implement generators one at a time
- Test each format with real tournament scenarios
- Create reusable bracket components
- Use existing patterns from Sprint 2
- Document complex algorithms (especially Swiss pairing)

### **For @qa (Quality Assurance):**
- Validate all formats produce correct pairings
- Test bracket progression logic thoroughly
- Verify fair-play points affect standings
- Test edge cases: ties, BYEs, odd numbers
- Ensure UI renders correctly for all formats

### **For @architect:**
- Design universal tournament engine interface
- Ensure generators are pluggable
- Plan for future formats (ladder, box league)
- Optimize bracket queries (recursive CTEs)
- Consider caching for complex brackets

---

## 🚀 Ready to Start!

**Next Step:** Run `@sm` to create user stories from this context.

**Expected Output:** ~25 detailed user stories for implementing all advanced tournament formats.

---

*Created: 2025-10-17*
*For: PadelGraph Sprint 3*
*Branch: sprint-3-advanced-formats*
