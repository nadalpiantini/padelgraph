# BMAD Quick Start - Padelgraph

## ✅ Installation Complete

BMAD-METHOD has been installed successfully in the Padelgraph project.

## 🤖 Available Agents

| Agent | Invoke | Role |
|-------|--------|------|
| Scrum Master | `@sm` | PRD → User Stories |
| Developer | `@dev` | Stories → Code |
| QA Engineer | `@qa` | Code → Validation |

## 🚀 First Steps

### 1. Test Agent Invocation

Try invoking an agent in your Claude Code chat:

```
@sm
```

You should see the Scrum Master agent activate and ask what you need.

### 2. Create Your First User Story

```
@sm story "Add like button to posts"
```

The agent will generate a complete User Story with acceptance criteria.

### 3. Implement the Story

```
@dev implement [story-id from @sm]
```

The Developer agent will write the code following project standards.

### 4. Validate Quality

```
@qa validate [story-id]
```

QA will check all acceptance criteria, run tests, and provide feedback.

## 📖 Example Session

**User:** "I want to add a notification system for new followers"

**@sm:**
```
Creating User Story: Follower Notifications

**Title**: Follower Notification System

**As a** Padelgraph user
**I want** to receive notifications when someone follows me
**So that** I can stay engaged and follow them back

**Acceptance Criteria**:
- [ ] Notification created when user gains follower
- [ ] Notification appears in /notifications page
- [ ] Real-time notification badge on navbar
- [ ] Mark as read functionality
- [ ] Email notification (optional setting)

**Story Points**: 8
**Technical Notes**: Use Supabase Realtime, notification table exists
```

**User:** "@dev implement story-follower-notifications"

**@dev:**
```
Implementing Follower Notification System...

✅ Created API route: src/app/api/notifications/route.ts
✅ Added real-time listener: src/hooks/useNotifications.ts
✅ Updated navbar component with badge
✅ Created notification page: src/app/[locale]/notifications/page.tsx
✅ Tests written and passing (92% coverage)
✅ TypeScript: 0 errors

Ready for QA validation.
```

**User:** "@qa validate story-follower-notifications"

**@qa:**
```
Quality Validation Report

✅ All 5 acceptance criteria met
✅ TypeScript: 0 errors
✅ Tests: 14 passing (92% coverage)
✅ Performance: API <50ms, page load <2s
✅ Security: RLS policies verified
✅ Accessibility: WCAG AA compliant

Status: APPROVED ✅
```

## 💡 Pro Tips

1. **Keep PRDs in `docs/prd/`** - Organized and accessible for @sm
2. **One story at a time** - Focus on quality over quantity
3. **Always run @qa** - Catch issues before they ship
4. **Use story IDs** - Reference stories consistently across agents
5. **Update acceptance criteria** - Refine stories as you learn

## 🔧 Advanced Usage

### Batch Story Generation
```
@sm analyze docs/prd/social-features.md
```
Generates multiple related stories from one PRD.

### Focused Implementation
```
@dev fix "post like button not incrementing count"
```
Quick fixes without full story workflow.

### Security Audit
```
@qa security src/app/api/posts
```
Focused security review of specific components.

## 📂 Where Things Go

```
docs/
├── prd/              ← Put your PRDs here
├── .bmad/
│   ├── stories/      ← @sm generates here
│   ├── implementations/ ← @dev docs here
│   └── reports/      ← @qa reports here
```

## 🎯 Next Steps

1. ✅ Installation complete
2. ⏳ Create your first PRD in `docs/prd/`
3. ⏳ Invoke `@sm` to generate stories
4. ⏳ Use `@dev` to implement
5. ⏳ Validate with `@qa`

**Ready to start!** Just type `@sm`, `@dev`, or `@qa` in the chat.
