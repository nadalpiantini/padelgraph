# Coding Standards - Padelgraph

## 🎯 General Principles

- **TypeScript Strict**: No implicit any, strict null checks
- **Functional Components**: React Server Components + Client Components
- **Error Handling**: Always try-catch in async functions
- **Validation**: Zod schemas for all API inputs
- **Comments**: Minimal - code should be self-documenting

---

## 📁 File Organization

### Components
```
src/components/
├─ {domain}/           # Group by domain
│  ├─ Component.tsx    # PascalCase
│  └─ types.ts         # Domain types
```

### API Routes
```
src/app/api/
├─ {resource}/
│  ├─ route.ts         # GET, POST handlers
│  └─ [id]/route.ts    # Dynamic routes
```

### Library Code
```
src/lib/
├─ {domain}/
│  ├─ types.ts
│  ├─ utils.ts
│  └─ service.ts
```

---

## 🎨 Naming Conventions

- **Components**: PascalCase (`UserProfile.tsx`)
- **Files**: kebab-case or PascalCase (follow existing)
- **Functions**: camelCase (`getUserData`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Types/Interfaces**: PascalCase (`UserProfile`)

---

## ✅ API Response Format

```typescript
// Success
{ data: T, success: true }

// Error
{ error: string, success: false }

// Paginated
{ data: T[], total: number, cursor?: string }
```

---

## 🔒 Security Standards

- **Never**: Expose user_id in URLs (use auth)
- **Always**: Validate with Zod
- **Always**: Check RLS policies
- **Never**: Trust client input

---

## 🧪 Testing Standards

- **Unit Tests**: vitest (src/lib/)
- **Integration Tests**: API routes
- **E2E Tests**: Playwright (critical flows)
- **Coverage**: Aim for 70%+

---

**Version**: 1.0
**Updated**: 2025-10-18
