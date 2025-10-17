# 🚀 Sprint 3 - Instrucciones para Próxima Sesión

> **Progreso Actual:** 50% completado (13/26 tareas)
> **Última actualización:** 2025-10-17
> **Estado:** ✅ Generators completados, ready for Bracket System

---

## 📋 Quick Start (Nueva Sesión)

### 1. Recuperar Contexto (CRÍTICO)

```bash
# En nuevo chat de Claude Code, pegar estos comandos:

# Activar proyecto
@serena activate_project Padelgraph

# Leer memoria más reciente
@serena read_memory sprint_3_generators_complete

# Leer context documento
cat claudedocs/SPRINT_3_CONTEXT.md

# Ver este checkpoint
cat claudedocs/SPRINT_3_NEXT_SESSION.md
```

### 2. Verificar Estado

```bash
# Ver archivos creados
ls -la src/lib/tournament-engine/

# Debería mostrar:
# - knockout.ts ✅
# - swiss.ts ✅
# - monrad.ts ✅
# - compass.ts ✅
# - round-robin.ts ✅ (extendido)

# TypeScript check
npm run typecheck
# Debe salir: ✅ 0 errors

# Build test
npm run build
# Debe compilar sin errores
```

### 3. Git Status Check

```bash
git status

# Debería mostrar archivos sin commit:
# - knockout.ts (new)
# - swiss.ts (new)
# - monrad.ts (new)
# - compass.ts (new)
# - round-robin.ts (modified)
# - standings.ts (modified)
```

---

## 🎯 Opciones para Continuar

### Opción A: Bracket Progression System ⭐ (Recomendado)

**Por qué primero:**
- Base crítica para Knockout/Double/Compass funcionen
- Necesario antes de APIs
- Lógica compleja, mejor hacerlo ahora

**Tareas:**
1. ✅ Crear `src/lib/tournament-engine/bracket-progression.ts`
2. ✅ Implementar `BracketProgressionService` class
3. ✅ Métodos: `advanceWinner()`, `routeLoser()`, `getNextMatch()`
4. ✅ Validación y tests

**Tiempo estimado:** 4-5h

**Código a implementar:**
```typescript
// src/lib/tournament-engine/bracket-progression.ts

export class BracketProgressionService {
  // Main method: advance winner to next round
  async advanceWinner(matchId: string, winnerId: string) {
    // 1. Find bracket position of this match
    // 2. Determine next bracket position
    // 3. Create/update next match with winner
    // 4. If double elim: route loser to losers bracket
  }

  // Find where this match is in bracket
  async findBracketPosition(matchId: string): Promise<BracketPosition> {}

  // Get or create next match in progression
  async getOrCreateNextMatch(bracket: BracketPosition): Promise<Match> {}

  // Assign team to next match
  async assignTeamToMatch(matchId: string, userId: string, position: 'team1' | 'team2') {}

  // Route loser to consolation bracket (double elim, compass)
  async routeLoserToBracket(loserId: string, sourceMatch: Match) {}
}
```

**Algoritmo clave:**
```typescript
// Progression logic for single elimination
function getNextBracketPosition(currentRound: number, currentPosition: number) {
  const nextRound = currentRound + 1;
  const nextPosition = Math.floor(currentPosition / 2);
  return { round: nextRound, position: nextPosition };
}

// For double elimination
function routeLoserFromWinners(round: number, position: number) {
  // Losers from winners round N go to losers round 2N-1
  const losersRound = (round * 2) - 1;
  return { bracket: 'losers', round: losersRound, position };
}
```

**Testing:**
```bash
# Después de implementar
npm run test -- bracket-progression

# Casos a testear:
# - Winner advances correctly
# - BYE auto-advances
# - Double elim loser routing
# - Final match (no progression)
```

---

### Opción B: APIs + Validation

**Por qué:**
- Validar generators funcionan end-to-end
- Detectar bugs temprano
- Preparar para UI

**Tareas:**
1. ✅ `POST /api/tournaments/[id]/generate/round-robin`
2. ✅ `POST /api/tournaments/[id]/generate/knockout`
3. ✅ `POST /api/tournaments/[id]/generate/swiss`
4. ✅ Testing con Postman/Thunder Client

**Tiempo estimado:** 3-4h

**Template API:**
```typescript
// app/api/tournaments/[id]/generate/knockout/route.ts

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { seeding, elimination_type, bronze_match } = await req.json();

  // 1. Get tournament
  const tournament = await getTournament(params.id);

  // 2. Get participants
  const participants = await getParticipants(params.id);

  // 3. Generate bracket
  const bracket = generateKnockoutBracket(participants, seeding);

  // 4. Save to database
  await saveBracket(tournament.id, bracket);

  return Response.json({ bracket });
}
```

---

### Opción C: UI Components

**Por qué después:**
- Depende de APIs funcionando
- Más tiempo consumo
- Menos crítico para lógica

**Tareas:**
1. ✅ Format selector
2. ✅ Bracket visualization
3. ✅ Group standings

**Tiempo estimado:** 6-8h

---

## 📦 Commit Recomendado (Antes de Continuar)

```bash
# Opción 1: Commit todo junto
git add src/lib/tournament-engine/
git commit -m "feat(sprint-3): implement all 6 tournament generators

Sprint 3 Progress: 50% complete (13/26 tasks)

Implemented Generators:
✅ Knockout Single Elimination (knockout.ts)
✅ Knockout Double Elimination (knockout.ts)
✅ Swiss System with pairing methods (swiss.ts)
✅ Monrad Hybrid (Swiss → Knockout) (monrad.ts)
✅ Compass Draw (7 brackets) (compass.ts)
✅ Round Robin with groups + playoffs (round-robin.ts)

Features:
- 6 complete tournament algorithms
- Seeding: random/ranked/manual
- BYE handling across all formats
- Validation functions for each generator
- ~1,654 lines of tournament logic

Technical:
- TypeScript: 0 errors
- Pattern: consistent across generators
- Database: ready (migrations applied)
- Tests: pending implementation

Next: Bracket Progression System

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Opción 2: Commit por partes
git add src/lib/tournament-engine/knockout.ts
git commit -m "feat: implement knockout elimination (single + double)"

git add src/lib/tournament-engine/swiss.ts
git commit -m "feat: implement swiss system pairing"

git add src/lib/tournament-engine/monrad.ts
git commit -m "feat: implement monrad hybrid system"

git add src/lib/tournament-engine/compass.ts
git commit -m "feat: implement compass draw with 7 brackets"

git add src/lib/tournament-engine/round-robin.ts
git commit -m "feat: extend round robin with groups + playoffs"
```

---

## 🔗 Archivos de Referencia

### Context & Roadmap
- **Sprint Context:** `claudedocs/SPRINT_3_CONTEXT.md`
- **Roadmap General:** `claudedocs/PADELGRAPH_SPRINTS.md`
- **Este Checkpoint:** `claudedocs/SPRINT_3_NEXT_SESSION.md`

### Memoria Serena
- **Memoria actual:** `sprint_3_generators_complete`
- **Memoria anterior:** `sprint_3_checkpoint_2025-10-17`

### Código Implementado
```
src/lib/tournament-engine/
├── types.ts              (updated - Sprint 3 types)
├── standings.ts          (updated - fair-play fields)
├── knockout.ts           (NEW - 390 lines)
├── swiss.ts              (NEW - 417 lines)
├── monrad.ts             (NEW - 234 lines)
├── compass.ts            (NEW - 371 lines)
└── round-robin.ts        (EXTENDED - +242 lines)
```

### Database
```
supabase/migrations/
├── 005_sprint_3_schema.sql      (✅ applied)
└── 006_sprint_3_policies.sql    (✅ applied)
```

---

## 📊 Progreso Detallado

```
SPRINT 3: Advanced Tournament Formats
======================================

✅ COMPLETADO (50%)
├── Database Schema          100% ✅
│   ├── tournament (8 formats)
│   ├── tournament_bracket
│   ├── tournament_group
│   └── tournament_fair_play
│
├── TypeScript Types         100% ✅
│   └── 9 new interfaces
│
└── Tournament Generators    100% ✅
    ├── Round Robin (basic + groups)
    ├── Knockout Single Elimination
    ├── Knockout Double Elimination
    ├── Swiss System
    ├── Monrad Hybrid
    └── Compass Draw

🚧 PENDIENTE (50%)
├── Bracket System           0%
│   ├── Progression Service
│   ├── Winner advancement
│   └── Loser routing
│
├── Fair-Play System         0%
│   ├── API endpoints
│   ├── Points integration
│   └── Admin panel UI
│
├── UI Components            0%
│   ├── Format selector
│   ├── Bracket visualization
│   └── Group standings
│
├── API Endpoints            0%
│   ├── Generation endpoints
│   └── Bracket management
│
└── Testing                  0%
    ├── Unit tests
    └── Integration tests
```

---

## ✅ Checklist Nueva Sesión

**Antes de empezar:**
- [ ] Activar proyecto Serena
- [ ] Leer memoria `sprint_3_generators_complete`
- [ ] Leer `SPRINT_3_CONTEXT.md`
- [ ] Verificar TypeScript: `npm run typecheck`
- [ ] Verificar build: `npm run build`
- [ ] Revisar git status

**Decidir:**
- [ ] Opción A: Bracket System (recomendado)
- [ ] Opción B: APIs + Testing
- [ ] Opción C: UI Components

**Opcional:**
- [ ] Commit generators actuales
- [ ] Crear branch para siguiente fase
- [ ] Push a remoto

---

## 🚨 Importante

**NO OLVIDES:**
1. Siempre leer memoria Serena al inicio
2. Seguir pattern de generators existentes
3. Mantener TypeScript sin errores
4. Usar BMAD workflow para tareas complejas
5. Actualizar checkpoint al final de sesión

**Comando rápido para empezar:**
```bash
# En nuevo chat:
siguiendo plan bmad sprint 3, lee memoria sprint_3_generators_complete y continúa con Opción A: Bracket Progression System
```

---

**¡Listo para continuar Sprint 3!** 🚀

*Siguiente objetivo: Bracket Progression System (Opción A)*
