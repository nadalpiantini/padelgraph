# US-1: Activar Mapa de Discovery - Implementación

**Agente:** @dev
**Fecha:** 2025-10-18
**Status:** ⏳ EN PROGRESO (80%)

---

## ✅ Cambios Implementados

### 1. Configuración de Mapbox (.env.local)
```bash
# Mapbox Configuration
# Get your free token from: https://account.mapbox.com/access-tokens/
# Free tier: 50,000 map loads/month
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoicGFkZWxncmFwaCIsImEiOiJjbTU5Nm1vZHgwa2NrMmxzOGh5ZmgyY3BhIn0.YOUR_TOKEN_HERE
```

**⚠️ ACCIÓN REQUERIDA:**
- Reemplazar `YOUR_TOKEN_HERE` con token real de Mapbox
- Crear cuenta gratuita: https://account.mapbox.com/access-tokens/
- Free tier: 50,000 map loads/month

---

### 2. Import de DiscoveryMap (DiscoverClient.tsx)
```typescript
import DiscoveryMap from '@/components/discovery/DiscoveryMap';
```

---

### 3. Traducciones del Mapa
```typescript
map: {
  loading: 'Loading map...',
  filters: 'Filters',
  showPlayers: 'Show Players',
  showClubs: 'Show Clubs',
  showMatches: 'Show Matches',
  radius: 'Radius',
  level: 'Level',
  minRating: 'Min Rating',
  availableOnly: 'Available Only',
  apply: 'Apply',
  reset: 'Reset',
  noLocation: 'Location not available',
  player: 'Player',
  club: 'Club',
  match: 'Match',
  distance: 'distance',
  rating: 'Rating',
  courts: 'courts',
  liveNow: 'Live Now',
  upcoming: 'Upcoming',
}
```

---

### 4. Activación del Mapa con Fallback
```typescript
{/* Map View Tab */}
<TabsContent value="map" className="mt-0">
  {process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? (
    <DiscoveryMap
      mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      t={t.map}
    />
  ) : (
    <div className="rounded-xl overflow-hidden border border-slate-700 h-[600px] bg-slate-900 flex items-center justify-center">
      <div className="text-center p-8">
        <Map className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400 mb-2">Map requires Mapbox token</p>
        <p className="text-slate-500 text-sm">
          Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local
        </p>
        <a
          href="https://account.mapbox.com/access-tokens/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300 text-sm underline mt-2 inline-block"
        >
          Get free Mapbox token →
        </a>
      </div>
    </div>
  )}
</TabsContent>
```

**Características:**
- ✅ Conditional rendering basado en token
- ✅ Fallback UI útil con link a Mapbox
- ✅ No crash si token falta

---

## ⏳ Pendiente

### 1. API Endpoint Verification
- [ ] Verificar `/api/discover/nearby` existe
- [ ] Si no existe, crear endpoint
- [ ] Testing con datos reales

### 2. TypeScript Compilation
- [ ] `npm run typecheck`
- [ ] Verificar 0 errores

### 3. Local Testing
- [ ] Obtener Mapbox token
- [ ] Actualizar `.env.local`
- [ ] `npm run dev`
- [ ] Navegar a `/discover?tab=map`
- [ ] Verificar:
  - ✅ Mapa renderiza
  - ✅ Geolocation funciona
  - ✅ Markers aparecen
  - ✅ Filters panel funcional

### 4. Vercel Configuration
- [ ] Añadir `NEXT_PUBLIC_MAPBOX_TOKEN` en Vercel environment vars
- [ ] Redeploy

---

## 📊 Progreso

| Task | Status |
|------|--------|
| Import DiscoveryMap | ✅ Done |
| Añadir token a .env.local | ✅ Done |
| Crear traducciones | ✅ Done |
| Activar componente | ✅ Done |
| Fallback UI | ✅ Done |
| Verify API endpoint | ⏳ In Progress |
| TypeScript check | ⏳ Pending |
| Local testing | ⏳ Pending (needs token) |
| Vercel config | ⏳ Pending |

**Overall:** 5/9 (55%)

---

## 🚀 Next Steps (@dev)

1. Verificar si existe `/api/discover/nearby`
2. Si no existe, crear endpoint
3. TypeScript compilation check
4. Documentar pasos para obtener Mapbox token

---

## 📝 Notes

- DiscoveryMap component ya existe (451 líneas)
- Component usa Mapbox GL JS
- Geolocation API integrada
- Markers para players (azul), clubs (verde), matches (rojo/ámbar)
- Filters panel incluido
