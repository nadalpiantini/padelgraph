# 🎯 BMAD Sprint 4: Travel Graph UI (85% → 100%)

**Agente Director:** @sm (Scrum Master)
**Fecha:** 2025-10-18
**Sprint Goal:** Completar Travel Graph UI con UX profesional

---

## 📋 User Stories (Priorizadas por @sm)

### 🔴 CRITICAL - P0 (Must Have)

#### US-1: Activar Mapa de Discovery Geográfico
**Como** usuario viajero
**Quiero** ver un mapa interactivo con jugadores, clubs y matches cercanos
**Para** planificar mis partidos cuando viajo

**Acceptance Criteria:**
- ✅ Mapa Mapbox renderiza en /discover?tab=map
- ✅ Geolocation obtiene posición del usuario
- ✅ Markers aparecen: azul (players), verde (clubs), rojo (matches)
- ✅ Popups muestran información relevante
- ✅ Filters panel funcional (tipo, radio, nivel)
- ✅ Performance: mapa carga < 2s

**Technical Tasks (@dev):**
1. Configurar NEXT_PUBLIC_MAPBOX_TOKEN en .env.local y Vercel
2. Descomentar línea 250 en DiscoverClient.tsx
3. Verificar API /api/discover/nearby retorna datos correctos
4. Testing local con geolocation mock
5. Testing producción con geolocation real

**Story Points:** 5
**Estimated Time:** 1 hora
**Dependencies:** Cuenta Mapbox activa

---

#### US-2: Visualizar Red Social con Grafo
**Como** usuario social
**Quiero** ver mi red de conexiones en un grafo visual
**Para** descubrir jugadores conectados y clusters

**Acceptance Criteria:**
- ✅ Tab "Network" visible en Discovery UI
- ✅ Grafo D3.js renderiza nodos (users) y edges (connections)
- ✅ Zoom y drag funcionan
- ✅ Click en nodo navega a perfil
- ✅ Clusters visibles por color (nivel o ubicación)
- ✅ Performance: grafo carga < 3s con 100 nodos

**Technical Tasks (@dev):**
1. Añadir nuevo TabsTrigger "Network" en DiscoverClient.tsx
2. Crear endpoint /api/discover/graph/route.ts
3. Query SQL: usuarios + conexiones (social_connection)
4. Integrar ConnectionVisualizer en TabsContent
5. Añadir data-testid para testing

**Story Points:** 8
**Estimated Time:** 45 min
**Dependencies:** ConnectionVisualizer component (ya existe)

---

### 🟡 IMPORTANT - P1 (Should Have)

#### US-3: Mejoras de Percepción de Performance
**Como** usuario impaciente
**Quiero** ver contenido progresivo mientras carga
**Para** no sentir que la app es lenta

**Acceptance Criteria:**
- ✅ Skeleton loaders en lugar de spinners
- ✅ Fade-in suave cuando carga completa
- ✅ No layout shift durante carga
- ✅ Perceived performance mejora 40%

**Technical Tasks (@dev):**
1. Crear MatchCardSkeleton.tsx
2. Crear MapSkeleton.tsx
3. Crear GraphSkeleton.tsx
4. Crear FeedSkeleton.tsx
5. Implementar en cada componente con isLoading

**Story Points:** 3
**Estimated Time:** 30 min
**Dependencies:** Ninguna

---

#### US-4: Optimización Mobile UX
**Como** usuario móvil
**Quiero** usar la app cómodamente en mi iPhone
**Para** descubrir jugadores mientras estoy en el club

**Acceptance Criteria:**
- ✅ UI usable en 375px (iPhone SE)
- ✅ Touch gestures: swipe carousel, pinch zoom en mapa
- ✅ Filters panel: bottom sheet en mobile, sidebar en desktop
- ✅ Botones táctiles > 44px (accesibilidad táctil)
- ✅ Performance mobile > 60fps

**Technical Tasks (@dev):**
1. DiscoveryMap: touch gestures (touchZoomRotate, touchPitch)
2. SearchFilters: responsive bottom sheet
3. RecommendationsWidget: swipe gestures
4. Breakpoints: sm(640), md(768), lg(1024)
5. Testing en Chrome DevTools + BrowserStack

**Story Points:** 5
**Estimated Time:** 45 min
**Dependencies:** Ninguna

---

### 🟢 NICE TO HAVE - P2 (Could Have)

#### US-5: Accesibilidad WCAG 2.1 AA
**Como** usuario con discapacidad
**Quiero** navegar la app con teclado y screen reader
**Para** tener igualdad de acceso

**Acceptance Criteria:**
- ✅ Lighthouse Accessibility score > 95
- ✅ Keyboard navigation completa (Tab, Enter, Esc, Arrows)
- ✅ ARIA labels completos y correctos
- ✅ Focus trap en modals
- ✅ Color contrast ratio > 4.5:1
- ✅ Screen reader compatible (VoiceOver/NVDA)

**Technical Tasks (@dev):**
1. Añadir aria-label, aria-expanded, aria-controls
2. Keyboard handlers: onKeyDown para Enter/Space/Esc/Arrows
3. Focus trap hook: useFocusTrap(modalRef, isOpen)
4. Focus-visible CSS con outline claro
5. Verificar contrast ratios con axe DevTools

**Story Points:** 3
**Estimated Time:** 30 min
**Dependencies:** Ninguna

---

#### US-6: Testing E2E Playwright
**Como** QA engineer
**Quiero** tests automatizados de flujos críticos
**Para** prevenir regresiones

**Acceptance Criteria:**
- ✅ Test: Mapa carga y muestra markers
- ✅ Test: Carousel navegación y feedback
- ✅ Test: Grafo interacciones (zoom, click)
- ✅ Test: Mobile responsive en 375px
- ✅ Coverage > 80% de flujos críticos
- ✅ Tests ejecutan < 2 min en CI

**Technical Tasks (@qa):**
1. discovery-map.spec.ts (geolocation, markers, filters)
2. recommendations-carousel.spec.ts (nav, feedback)
3. connection-graph.spec.ts (D3, zoom, click)
4. mobile-responsive.spec.ts (viewport, gestures)
5. Integrar en GitHub Actions CI

**Story Points:** 5
**Estimated Time:** 45 min (paralelo con dev)
**Dependencies:** US-1, US-2 completas

---

## 🎯 Sprint Plan (3-4 horas)

### Fase 1: Critical Features (2h)
**Agente:** @dev
- [ ] US-1: Activar Mapa (1h)
- [ ] US-2: Grafo Social (45min)
- [ ] Checkpoint: Deploy to staging, smoke test

### Fase 2: UX Enhancements (1.5h)
**Agente:** @dev
- [ ] US-3: Skeleton Loaders (30min)
- [ ] US-4: Mobile UX (45min)
- [ ] US-5: Accesibilidad (30min)
- [ ] Checkpoint: Lighthouse audit

### Fase 3: QA & Deploy (30-45min)
**Agente:** @qa
- [ ] US-6: E2E Tests (30min)
- [ ] Regression testing
- [ ] Production deployment
- [ ] Smoke test producción

---

## 📊 Definition of Done (@sm + @qa)

✅ **Feature Complete:**
- [ ] Todos los AC cumplidos
- [ ] Code review aprobado
- [ ] TypeScript: 0 errores
- [ ] Linting: 0 warnings críticos

✅ **Quality Gates (@qa):**
- [ ] Unit tests: coverage > 70%
- [ ] E2E tests: todos pasan
- [ ] Lighthouse Performance > 90
- [ ] Lighthouse Accessibility > 95
- [ ] Mobile usability > 90

✅ **Deployment:**
- [ ] Staging deployment exitoso
- [ ] Production deployment exitoso
- [ ] Smoke test en producción pasa
- [ ] Rollback plan documentado

✅ **Documentation:**
- [ ] README actualizado
- [ ] API docs actualizadas (si aplica)
- [ ] Changelog actualizado

---

## 🚦 Risk Management (@sm)

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Mapbox token no configurado | 🔴 High | 🟡 Medium | Crear cuenta antes de empezar |
| Geolocation bloqueada en browser | 🟡 Medium | 🟢 Low | Fallback a ubicación por IP |
| D3.js performance con 1000+ nodos | 🟡 Medium | 🟡 Medium | Lazy loading, pagination |
| Mobile testing incompleto | 🟢 Low | 🟡 Medium | BrowserStack para real devices |

---

## 📈 Success Metrics (@sm)

| Métrica | Baseline | Target | Measurement |
|---------|----------|--------|-------------|
| Discovery page views | 500/week | 1000/week | Google Analytics |
| Map interactions | 0 | 300/week | Event tracking |
| Graph interactions | 0 | 200/week | Event tracking |
| Mobile bounce rate | 45% | < 30% | Analytics |
| Avg session time | 2min | 4min | Analytics |

---

## 🎬 Execution Plan

**@sm dice:**
> "Equipo, tenemos 6 User Stories priorizadas para completar Sprint 4. @dev, comienza con US-1 (Mapa) y US-2 (Grafo) - son P0 críticas. Mientras tanto, @qa prepara el ambiente de testing. Checkpoint en 2 horas para review de features críticas."

**@dev responde:**
> "Entendido. Comenzando con US-1: configuración de Mapbox y activación del mapa. ETA: 1 hora."

**@qa responde:**
> "Preparando specs de testing para US-6. Estaré listo para testing E2E cuando US-1 y US-2 estén en staging."

---

**Next Action:** @dev implementa US-1 (Activar Mapa) 🚀
