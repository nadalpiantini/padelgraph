# Padelgraph Documentation

## 🤖 BMAD Agents

This project uses BMAD-METHOD agents for development workflow.

### Available Agents

| Agent | Command | Purpose |
|-------|---------|---------|
| 🎯 Scrum Master | `@sm` | Convert PRDs to User Stories |
| 💻 Developer | `@dev` | Implement features |
| 🧪 QA Engineer | `@qa` | Validate quality |

### Quick Start

**1. Create User Stories from PRD:**
```
@sm analyze docs/prd/feature-name.md
```

**2. Implement Story:**
```
@dev implement story-123
```

**3. Validate Implementation:**
```
@qa validate story-123
```

### Workflow

```
PRD → @sm → User Stories → @dev → Implementation → @qa → Validation ✅
```

### Folder Structure

```
docs/
├── README.md (this file)
├── prd/ (Product Requirements Documents)
├── .bmad/ (BMAD working directory)
│   ├── stories/ (User Stories from @sm)
│   ├── implementations/ (Code docs from @dev)
│   └── reports/ (QA reports from @qa)
└── architecture/ (System design docs)
```

### Agent Details

#### @sm - Scrum Master
- Reads PRD documents
- Generates User Stories with acceptance criteria
- Assigns story points
- Maps dependencies

#### @dev - Developer
- Implements User Stories
- Follows project conventions (Next.js 15, TypeScript, Supabase)
- Writes tests
- Documents code

#### @qa - Quality Assurance
- Validates acceptance criteria
- Runs automated tests
- Security review
- Performance check
- Generates quality reports

### Project Standards

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase PostgreSQL
- **Styling**: Tailwind CSS
- **API**: RESTful routes in `src/app/api/`
- **Testing**: Jest + React Testing Library
- **Quality**: >80% coverage, 0 TS errors

### Example Session

```
User: "I have a PRD for social feed feature"
@sm: "Let me analyze that and create User Stories"
  → Generates 5 stories in docs/.bmad/stories/

User: "@dev implement story-001"
@dev: "Implementing post creation API..."
  → Creates API route, tests, types

User: "@qa validate story-001"
@qa: "Running validation..."
  → ✅ All acceptance criteria met
  → ✅ Tests passing (95% coverage)
  → ✅ TypeScript OK
  → ✅ Security OK
```

## 📚 Additional Documentation

- [Architecture Overview](./architecture/overview.md)
- [API Documentation](./api/README.md)
- [Database Schema](./database/schema.md)
- [Deployment Guide](./deployment/README.md)
