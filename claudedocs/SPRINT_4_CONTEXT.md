# 🧩 SPRINT 4: Travel Mode & Graph Intelligence

> **Objetivo Principal:** Implementar sistema de descubrimiento inteligente, modo viaje, y grafo social "Six Degrees of Pádel"
> **Duración Estimada:** 10-12 días
> **Progreso Actual:** 0% (0/30 tareas)
> **Branch:** `sprint-4-travel-graph`

---

## 📋 Contexto del Sprint

### ¿Por Qué Este Sprint?

Después de completar el sistema de torneos avanzado (Sprint 3), necesitamos:

1. **Descubrimiento Inteligente**: Los usuarios necesitan encontrar jugadores, clubes y torneos cercanos
2. **Modo Viaje**: Funcionalidad para jugadores que viajan y quieren jugar en otras ciudades
3. **Grafo Social**: Conectar jugadores mediante "Six Degrees of Pádel" (como Six Degrees of Kevin Bacon)
4. **Privacidad Avanzada**: Control granular de visibilidad y datos de ubicación

### Dependencias del Sprint 3

✅ **Completado en Sprint 3:**
- Sistema de torneos avanzado (8 formatos)
- Bracket visualization y fair-play
- Admin panel completo
- APIs REST completas

🔗 **Requerido para Sprint 4:**
- User profiles (Sprint 1) ✅
- Location data (a implementar) 🚧
- Privacy settings (a extender) 🚧
- Recommendations engine (a crear) 🚧

---

## 🎯 Objetivos del Sprint

### 🗺️ **1. Travel Mode (Modo Viaje)**

**User Story:** Como jugador viajero, quiero activar "modo viaje" para encontrar jugadores y clubes en la ciudad que visito.

**Tareas:**
- [ ] Schema: tabla `travel_plan` (location, dates, preferences)
- [ ] API: POST/GET/PUT/DELETE `/api/travel-plans`
- [ ] UI: Travel mode toggle + destination selector
- [ ] Logic: Auto-suggest clubs/tournaments en destino
- [ ] Notifications: Avisos cuando match cercano disponible

**Acceptance Criteria:**
- Usuario puede crear plan de viaje con fechas y ciudad
- Sistema sugiere clubes y torneos automáticamente
- Perfil muestra badge "Viajando en [Ciudad]"
- Privacidad: solo visible para jugadores en esa ciudad

---

### 🔍 **2. Discovery & Nearby API**

**User Story:** Como jugador, quiero descubrir jugadores, clubes y partidos cerca de mí.

**Tareas:**
- [ ] PostGIS setup (geospatial extension Supabase)
- [ ] Location schema: lat/lng en user_profile, clubs
- [ ] API: GET `/api/discover/nearby?type=players|clubs|matches&radius=10km`
- [ ] Filters: nivel, disponibilidad, rating
- [ ] UI: Map view con markers (Mapbox/Leaflet)
- [ ] Permissions: geolocation browser API

**Acceptance Criteria:**
- API retorna entidades dentro de radio especificado
- Map UI muestra jugadores/clubes/matches cercanos
- Filtros funcionales (nivel, rating, disponibilidad)
- Performance: respuesta <500ms para 1000+ usuarios

---

### 🕸️ **3. Six Degrees of Pádel (Grafo Social)**

**User Story:** Como jugador, quiero ver mi "conexión de pádel" con cualquier otro jugador (ej: "2 grados de separación").

**Tareas:**
- [ ] Graph modeling: relaciones jugador-jugador
- [ ] Algorithm: Breadth-First Search para shortest path
- [ ] API: GET `/api/graph/connection?from=userA&to=userB`
- [ ] UI: Connection visualizer (D3.js o vis.js)
- [ ] Cache: Redis para paths frecuentes
- [ ] Analytics: track conexiones más comunes

**Acceptance Criteria:**
- Algoritmo encuentra path en <2s para cualquier par
- UI muestra path visual con jugadores intermedios
- Stats: "Estás a X grados de [jugador famoso]"
- Privacy: respetar configuración de privacidad

**Ejemplo:**
```
Tu → Juan (jugaste torneo) → María (amiga de Juan) → Carlos
"Estás a 2 grados de separación de Carlos"
```

---

### 🤖 **4. Recomendador IA**

**User Story:** Como jugador, quiero recibir recomendaciones personalizadas de jugadores, clubes y torneos.

**Tareas:**
- [ ] Feature engineering: skill, location, play style, history
- [ ] Modelo: collaborative filtering básico
- [ ] API: GET `/api/recommendations?type=players|tournaments`
- [ ] Integration: OpenAI embeddings para match semántico
- [ ] UI: Feed de recomendaciones en home
- [ ] A/B testing: track click-through rate

**Acceptance Criteria:**
- Recomendaciones basadas en historial + preferencias
- Min 60% relevancia (user feedback)
- Actualización diaria de recomendaciones
- Explicability: "Recomendado porque jugaste con..."

---

### 💬 **5. Conversaciones Automáticas**

**User Story:** Como sistema, quiero iniciar conversaciones automáticas entre jugadores compatibles.

**Tareas:**
- [ ] Match algorithm: similarity score entre jugadores
- [ ] Trigger: auto-create chat si score >0.8
- [ ] Template messages: "Hola! Vi que también juegas en [club]..."
- [ ] Opt-out: setting para deshabilitar auto-match
- [ ] API: POST `/api/auto-match/trigger`
- [ ] Moderation: spam prevention

**Acceptance Criteria:**
- Sistema crea max 3 auto-chats/semana por usuario
- Template personalizado con datos comunes
- Usuario puede deshabilitar feature
- Track conversion: % chats que resultan en partido

---

### 🌐 **6. Feed de Descubrimiento**

**User Story:** Como jugador, quiero ver un feed de actividad cercana (partidos, torneos, jugadores nuevos).

**Tareas:**
- [ ] Feed algorithm: location + time + relevance
- [ ] API: GET `/api/feed/discovery?location=auto&radius=20km`
- [ ] UI: Infinite scroll feed con cards
- [ ] Filters: tipo de evento, fecha, nivel
- [ ] Real-time: WebSocket para eventos live
- [ ] Engagement: like/bookmark eventos

**Acceptance Criteria:**
- Feed actualizado cada 30min
- Real-time para eventos live (nuevo partido en 1h)
- Performance: infinite scroll smooth
- Personalización basada en intereses

---

### 🔒 **7. Privacidad Avanzada**

**User Story:** Como usuario, quiero control granular sobre quién ve mi ubicación y perfil.

**Tareas:**
- [ ] Schema: tabla `privacy_settings` (location_visibility, profile_visibility, auto_match_enabled)
- [ ] Levels: public, friends, clubs_only, private
- [ ] API: GET/PUT `/api/privacy-settings`
- [ ] UI: Privacy dashboard con toggles
- [ ] Enforcement: RLS policies en Supabase
- [ ] Audit: log de accesos a ubicación

**Acceptance Criteria:**
- 4 niveles de privacidad configurables
- Default: "clubs_only" (visible solo en mis clubes)
- Enforcement a nivel database (RLS)
- UI clara con preview de visibilidad

---

## 🗄️ Database Schema (Sprint 4)

### New Tables

```sql
-- Travel Plans
CREATE TABLE travel_plan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profile(user_id) ON DELETE CASCADE,
  destination_city VARCHAR(100) NOT NULL,
  destination_country VARCHAR(100),
  location GEOGRAPHY(POINT, 4326), -- PostGIS
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  preferences JSONB, -- { level: 'intermediate', format: 'doubles' }
  status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Privacy Settings
CREATE TABLE privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES user_profile(user_id) ON DELETE CASCADE,
  location_visibility VARCHAR(20) DEFAULT 'clubs_only', -- public, friends, clubs_only, private
  profile_visibility VARCHAR(20) DEFAULT 'public',
  auto_match_enabled BOOLEAN DEFAULT true,
  show_in_discovery BOOLEAN DEFAULT true,
  graph_visibility VARCHAR(20) DEFAULT 'friends', -- who can see graph connections
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social Graph Connections
CREATE TABLE social_connection (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a UUID REFERENCES user_profile(user_id) ON DELETE CASCADE,
  user_b UUID REFERENCES user_profile(user_id) ON DELETE CASCADE,
  connection_type VARCHAR(50), -- played_with, friend, clubmate, tournament
  strength INTEGER DEFAULT 1, -- number of interactions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_connection UNIQUE(user_a, user_b)
);

-- Discovery Events (for feed)
CREATE TABLE discovery_event (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50), -- new_player, upcoming_match, new_tournament
  entity_id UUID, -- reference to player/match/tournament
  location GEOGRAPHY(POINT, 4326),
  visibility VARCHAR(20) DEFAULT 'public',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recommendations Cache
CREATE TABLE recommendation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profile(user_id) ON DELETE CASCADE,
  recommended_type VARCHAR(50), -- player, club, tournament
  recommended_id UUID NOT NULL,
  score DECIMAL(3,2), -- 0.00-1.00
  reason TEXT,
  shown BOOLEAN DEFAULT false,
  clicked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Schema Extensions

```sql
-- Add location to existing tables
ALTER TABLE user_profile ADD COLUMN location GEOGRAPHY(POINT, 4326);
ALTER TABLE club ADD COLUMN location GEOGRAPHY(POINT, 4326);

-- Add travel mode indicator
ALTER TABLE user_profile ADD COLUMN travel_mode BOOLEAN DEFAULT false;
ALTER TABLE user_profile ADD COLUMN travel_destination VARCHAR(100);

-- Indexes for performance
CREATE INDEX idx_location_user ON user_profile USING GIST(location);
CREATE INDEX idx_location_club ON club USING GIST(location);
CREATE INDEX idx_location_travel ON travel_plan USING GIST(location);
CREATE INDEX idx_social_graph ON social_connection(user_a, user_b);
```

---

## 📡 API Endpoints (Sprint 4)

### Travel Mode
```
POST   /api/travel-plans              - Create travel plan
GET    /api/travel-plans               - List my travel plans
GET    /api/travel-plans/[id]          - Get plan details
PUT    /api/travel-plans/[id]          - Update plan
DELETE /api/travel-plans/[id]          - Cancel plan
GET    /api/travel-plans/[id]/suggestions - Get clubs/tournaments in destination
```

### Discovery
```
GET    /api/discover/nearby            - Find nearby players/clubs/matches
GET    /api/discover/feed              - Discovery feed (location-based)
POST   /api/discover/bookmark          - Save discovery item
```

### Social Graph
```
GET    /api/graph/connection           - Find connection between two users
GET    /api/graph/network              - Get my network (1st degree)
GET    /api/graph/stats                - Get graph statistics
```

### Recommendations
```
GET    /api/recommendations            - Get personalized recommendations
POST   /api/recommendations/feedback   - Track click/interaction
```

### Privacy
```
GET    /api/privacy-settings           - Get my privacy settings
PUT    /api/privacy-settings           - Update privacy settings
```

---

## 🎨 UI Components (Sprint 4)

### 1. Travel Mode Panel
**Location:** `src/components/travel/TravelModePanel.tsx`
- Toggle travel mode on/off
- Destination selector (city autocomplete)
- Date range picker
- Preferences form
- Suggestions list (clubs/tournaments)

### 2. Discovery Map
**Location:** `src/components/discovery/DiscoveryMap.tsx`
- Map view (Mapbox/Leaflet)
- Player markers with click details
- Club markers
- Match markers (live/upcoming)
- Filters sidebar

### 3. Discovery Feed
**Location:** `src/components/discovery/DiscoveryFeed.tsx`
- Infinite scroll card feed
- Event cards (new player, match, tournament)
- Bookmark/like actions
- Real-time updates (WebSocket)

### 4. Connection Visualizer
**Location:** `src/components/graph/ConnectionVisualizer.tsx`
- Graph visualization (D3.js)
- Show path between users
- Interactive nodes (click to expand)
- Stats display

### 5. Recommendations Widget
**Location:** `src/components/recommendations/RecommendationsWidget.tsx`
- Carousel of recommendations
- Reason display ("porque jugaste con...")
- Quick actions (view/message/dismiss)
- Feedback buttons

### 6. Privacy Dashboard
**Location:** `src/components/settings/PrivacyDashboard.tsx`
- Visibility toggles
- Preview mode (how others see me)
- Audit log
- Data download

---

## 🔧 Technical Stack Additions

### Geospatial
- **PostGIS:** Supabase extension para queries espaciales
- **Turf.js:** Cálculos geométricos en client
- **Mapbox/Leaflet:** Map rendering

### Graph & Algorithms
- **Graph algorithm:** BFS para shortest path (implementación custom)
- **Redis:** Cache para paths frecuentes (opcional)

### Recommendations
- **OpenAI Embeddings:** Para match semántico de perfiles
- **Collaborative Filtering:** Algoritmo básico (user-user similarity)

### Real-time
- **Supabase Realtime:** Para discovery feed live updates
- **WebSocket:** Notificaciones de eventos cercanos

---

## 📊 Success Metrics (Sprint 4)

| Métrica | Target | Measurement |
|---------|--------|-------------|
| **Travel Mode Activation** | 30% de usuarios activos | % que activan al menos 1x |
| **Discovery API Performance** | <500ms @ 1000 users | p95 response time |
| **Graph Connection Time** | <2s para cualquier par | p99 BFS execution |
| **Recommendation CTR** | >60% relevancia | Click-through rate |
| **Privacy Adoption** | 80% usan settings custom | % vs default |
| **Auto-match Conversion** | 20% resulta en partido | % chats → bookings |

---

## 🚀 Implementation Plan

### **Phase 1: Foundation (Days 1-3)**
- [x] PostGIS setup en Supabase
- [ ] Database schema (5 nuevas tablas)
- [ ] Location fields en user_profile + club
- [ ] RLS policies para privacy
- [ ] Migration scripts

### **Phase 2: Core APIs (Days 4-6)**
- [ ] Travel Plans APIs (CRUD)
- [ ] Discovery/Nearby API
- [ ] Privacy Settings API
- [ ] Social Graph basic API
- [ ] Testing con Postman

### **Phase 3: Intelligence (Days 7-8)**
- [ ] BFS algorithm (graph shortest path)
- [ ] Recommendations engine (basic)
- [ ] OpenAI integration para embeddings
- [ ] Auto-match logic
- [ ] Caching strategy

### **Phase 4: UI Components (Days 9-11)**
- [ ] TravelModePanel
- [ ] DiscoveryMap
- [ ] DiscoveryFeed
- [ ] ConnectionVisualizer
- [ ] RecommendationsWidget
- [ ] PrivacyDashboard

### **Phase 5: Testing & Polish (Days 12)**
- [ ] Unit tests (graph, recommendations)
- [ ] Integration tests (APIs)
- [ ] E2E tests (travel mode flow)
- [ ] Performance testing (1000+ users)
- [ ] Bug fixes
- [ ] Documentation

---

## 🔗 Referencias Importantes

### Documentación Sprint
- **Este contexto:** `claudedocs/SPRINT_4_CONTEXT.md`
- **Roadmap general:** `claudedocs/PADELGRAPH_SPRINTS.md`
- **Sprint anterior:** `claudedocs/SPRINT_3_FINAL_CLOSURE.md`

### Sprint 3 Dependencies
- User profiles ✅
- Authentication ✅
- Tournaments system ✅

### External Resources
- **PostGIS Docs:** https://postgis.net/documentation/
- **Mapbox GL JS:** https://docs.mapbox.com/mapbox-gl-js/
- **D3.js Graph:** https://d3js.org/
- **Turf.js:** https://turfjs.org/

---

## 📝 Notas para el Desarrollo

### BMAD Workflow Recomendado

1. **Planning:**
   ```bash
   # En chat de BMAD (Gemini/ChatGPT):
   *pm
   Paste este documento SPRINT_4_CONTEXT.md
   ```

2. **Implementation:**
   ```bash
   # En Claude Code/Cursor:
   Leer claudedocs/SPRINT_4_CONTEXT.md
   Implementar fase por fase
   ```

3. **Validation:**
   - TypeScript: `npm run typecheck`
   - Build: `npm run build`
   - Tests: `npm test`

### Critical Paths

1. **PostGIS MUST be first:** Todo depende de geolocation
2. **Privacy RLS:** Implementar ANTES de discovery API
3. **Graph algorithm:** Optimizar para <2s desde el inicio
4. **Real-time:** WebSocket setup early para evitar refactor

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| PostGIS performance | Proper indexes + caching |
| Graph too slow | Redis cache + limit depth to 4 |
| Privacy leaks | RLS at database level + audit |
| OpenAI costs | Cache embeddings + limit calls |

---

## ✅ Ready to Start

**Pre-requisitos:**
- [x] Sprint 3 completado al 100%
- [x] Database migrations applied
- [x] TypeScript 0 errors
- [x] Production deployment exitoso

**Primer comando:**
```bash
git checkout -b sprint-4-travel-graph
cat claudedocs/SPRINT_4_CONTEXT.md
```

---

**🚀 ¡Sprint 4 Ready to Launch!**

*Última actualización: 2025-10-17*
