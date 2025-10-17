# 🤖 BMAD Workflow para PadelGraph

> **BMAD-METHOD instalado exitosamente** ✅
> **Versión:** 4.44.1
> **IDE:** Claude Code
> **Fecha:** 2025-10-16

---

## 🎯 ¿Qué es BMAD en este proyecto?

BMAD-METHOD es tu framework de agentes IA que te ayudará a **implementar cada sprint** de PadelGraph de forma estructurada:

- **@sm** (Scrum Master) - Toma el contexto del sprint y crea historias de usuario detalladas
- **@dev** (Developer) - Implementa las historias con código production-ready
- **@qa** (Quality Assurance) - Valida calidad, tests, y detecta bugs
- **@architect** - Diseña arquitectura y toma decisiones técnicas
- **@analyst** - Analiza requisitos de negocio del PRD

---

## 🔄 Workflow BMAD + Sprints PadelGrap

### **Fase 1: Iniciar Sprint (usa @sm)**

Cada vez que inicies un sprint (ej: Sprint 0, Sprint 1):

```bash
# 1. Abre nueva conversación
# 2. Pega el SPRINT_X_CONTEXT.md
# 3. Luego ejecuta:
/sm

# El Scrum Master leerá el contexto y creará historias de usuario
```

**Ejemplo para Sprint 1:**
```
[Pegar SPRINT_1_CONTEXT.md]

Luego escribir:
@sm crea historias de usuario para Sprint 1
```

El SM generará algo como:
```
Story S1-01: User Authentication with Supabase
Story S1-02: User Profile CRUD
Story S1-03: WhatsApp Notifications Setup
...
```

---

### **Fase 2: Implementar Historias (usa @dev)**

Para cada historia creada por @sm:

```bash
/dev

# El Developer preguntará qué historia implementar
# Responde: "S1-01" o pega la historia completa
```

**Ejemplo:**
```
@dev implementa Story S1-01: User Authentication

El DEV:
1. Lee la historia
2. Diseña la solución
3. Implementa código
4. Crea tests
5. Documenta
```

---

### **Fase 3: Validar Calidad (usa @qa)**

Después que @dev termine:

```bash
/qa

# QA revisará el código recién implementado
```

**Ejemplo:**
```
@qa valida implementación de S1-01

QA verificará:
- Tests funcionando
- Coverage >60%
- TypeScript sin errores
- RLS policies correctas
- Seguridad
- Performance
```

---

## 🏗️ Workflow Completo por Sprint

### **Sprint 0: Infraestructura**
```
1. [Nueva conversación]
2. [Pegar SPRINT_0_CONTEXT.md]
3. @sm → Crear historias de infra
4. @architect → Revisar arquitectura base
5. @dev → Implementar setup (Next.js, Supabase, etc)
6. @qa → Validar configuración
```

### **Sprint 1: Core & Comunicación**
```
1. [Nueva conversación]
2. [Pegar SPRINT_1_CONTEXT.md]
3. @sm → Crear 10-15 historias para:
   - Auth
   - Perfiles
   - WhatsApp/Email
   - Feed
   - Reservas
4. @dev → Implementar historia por historia
5. @qa → Validar cada feature
6. Repetir hasta completar sprint
```

### **Sprint 2: Tournaments**
```
1. [Nueva conversación]
2. [Pegar SPRINT_2_CONTEXT.md cuando esté listo]
3. @sm → Crear historias de torneos
4. @architect → Diseñar motor de generación de rondas
5. @dev → Implementar
6. @qa → Validar con torneos de prueba
```

---

## 📋 Agentes Disponibles

| Comando | Agente | Uso Principal |
|---------|--------|---------------|
| `/sm` | Scrum Master | Crear historias de usuario |
| `/dev` | Developer | Implementar código |
| `/qa` | Quality Assurance | Validar y detectar bugs |
| `/architect` | Arquitecto | Decisiones de diseño |
| `/analyst` | Analista de Negocio | Analizar PRD y requisitos |
| `/pm` | Product Manager | Priorización y roadmap |
| `/po` | Product Owner | Visión de producto |
| `/ux-expert` | UX Expert | Diseño de experiencia |
| `/bmad-orchestrator` | Orquestador | Coordinar múltiples agentes |

---

## 💡 Patrones Recomendados

### **Patrón 1: Sprint Lineal**
```
@sm → @dev → @qa → @dev → @qa → ... → Sprint Complete
```
Bueno para sprints con historias independientes.

### **Patrón 2: Diseño Primero**
```
@architect → @sm → @dev → @qa
```
Bueno para features complejas (ej: Tournament Engine).

### **Patrón 3: Análisis Profundo**
```
@analyst → @architect → @sm → @dev → @qa
```
Bueno cuando el PRD tiene ambigüedades.

### **Patrón 4: Orquestación**
```
/bmad-orchestrator

Le dices: "Implementa Sprint 1 completo"
El orquestador coordina SM → DEV → QA automáticamente
```

---

## 🎯 Comandos Útiles de BMAD

```bash
# Ver todas las historias creadas
ls .bmad-core/data/stories/

# Ver checklist del sprint actual
cat .bmad-core/checklists/sprint-checklist.md

# Generar documentación del proyecto
/document-project

# Crear historia brownfield (para código existente)
/brownfield-create-story

# Validar próxima historia antes de implementar
/validate-next-story

# Ejecutar gate de calidad
/qa-gate

# Indexar documentación del proyecto
/index-docs
```

---

## 🔗 Integración con Sistema de Sprints

Los sprints en `claudedocs/PADELGRAPH_SPRINTS.md` y BMAD trabajan juntos:

1. **PADELGRAPH_SPRINTS.md** - Control maestro de alto nivel
2. **SPRINT_X_CONTEXT.md** - Contexto para conversación
3. **BMAD Agents** - Ejecutores que implementan el plan

**Flujo:**
```
PADELGRAPH_SPRINTS.md (qué hacer)
        ↓
SPRINT_X_CONTEXT.md (contexto detallado)
        ↓
@sm (crear historias)
        ↓
@dev (implementar)
        ↓
@qa (validar)
        ↓
Actualizar PADELGRAPH_SPRINTS.md (marcar completado)
```

---

## 📊 Tracking de Progreso

### **Durante el Sprint:**
BMAD guarda automáticamente en `.bmad-core/data/`:
- `stories/` - Historias creadas
- `specs/` - Especificaciones técnicas
- `qa-reports/` - Reportes de calidad

### **Al Finalizar Sprint:**
1. Verificar que todas las historias estén completas
2. Ejecutar `/qa-gate` para reporte final
3. Actualizar `PADELGRAPH_SPRINTS.md` con:
   - Historias completadas
   - Issues encontrados
   - Handoff notes para siguiente sprint

---

## 🚀 Empezar Ahora

### **Para Sprint 0 (Infraestructura):**
```
1. Abre NUEVA conversación
2. Copia/pega: claudedocs/SPRINT_0_CONTEXT.md
3. Escribe: @sm crea historias para Sprint 0
4. Implementa con @dev
5. Valida con @qa
```

### **Para desarrollo iterativo:**
```
# Ciclo corto para cada feature:
@sm → crear historia
@dev → implementar
@qa → validar
→ Repetir
```

---

## 📖 Recursos

- **User Guide completo:** `.bmad-core/user-guide.md`
- **Workflow detallado:** `.bmad-core/enhanced-ide-development-workflow.md`
- **Templates:** `.bmad-core/templates/`
- **Checklists:** `.bmad-core/checklists/`

---

## 🎓 Tips

1. **Siempre empieza con @sm** - Crea historias antes de codear
2. **Una historia a la vez** - No intentes implementar todo el sprint de golpe
3. **@qa entre historias** - Detecta problemas temprano
4. **@architect para diseño** - Decisiones técnicas complejas
5. **Lee el user-guide** - Tiene muchísimos detalles útiles

---

**¡BMAD está listo para construir PadelGraph! 🏓🚀**

*Próximo paso: Abre nueva conversación y comienza Sprint 0 con @sm*