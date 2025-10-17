# E2E Test Suite - PadelGraph

## Overview

Comprehensive end-to-end testing suite using Playwright to ensure all critical user flows work correctly.

## Test Structure

```
tests/e2e/
├── auth/                   # Authentication flow tests
│   ├── login.spec.ts      # Login scenarios
│   ├── signup.spec.ts     # Signup scenarios
│   └── logout.spec.ts     # Logout scenarios
├── navigation/            # Page navigation tests
│   ├── public-pages.spec.ts
│   ├── tournaments.spec.ts
│   ├── admin-pages.spec.ts
│   ├── player-pages.spec.ts
│   └── mobile-navigation.spec.ts
├── flows/                 # Critical user flows
│   ├── tournament-registration.spec.ts
│   ├── social-interaction.spec.ts
│   └── profile-update.spec.ts
├── fixtures/              # Test fixtures
│   └── auth.fixture.ts    # Authentication helpers
└── helpers/               # Test utilities
    ├── env.ts             # Environment config
    ├── navigation.ts      # Navigation helpers
    └── forms.ts           # Form helpers
```

## Running Tests

### Local Development

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# View last test report
npm run test:e2e:report
```

### Environment Variables

Create `.env.test.local` with:

```env
TEST_USER_EMAIL=test@padelgraph.com
TEST_USER_PASSWORD=your_test_password
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

### Running Specific Tests

```bash
# Run specific file
npx playwright test tests/e2e/auth/login.spec.ts

# Run tests matching pattern
npx playwright test --grep "should successfully log in"

# Run in specific browser
npx playwright test --project=chromium
```

## Test Coverage

### Authentication (15 tests)
- ✅ Login with valid/invalid credentials
- ✅ Signup with email confirmation
- ✅ Form validation
- ✅ Session management
- ✅ Logout functionality

### Navigation (25 tests)
- ✅ All public pages load correctly
- ✅ Tournament pages accessible
- ✅ Admin pages (role-based)
- ✅ Player profiles
- ✅ Mobile responsive navigation

### Critical Flows (12 tests)
- ✅ Tournament registration end-to-end
- ✅ Social interactions (post/like/comment)
- ✅ Profile updates with persistence

**Total Tests**: ~52 tests

## CI/CD Integration

Tests run automatically on:
- Pull requests to `main` or `develop`
- Pushes to `main`
- Manual workflow dispatch

See `.github/workflows/e2e.yml` for configuration.

## Writing New Tests

### Basic Test Template

```typescript
import { test, expect } from '@playwright/test';
import { navigateAndWait } from '../helpers/navigation';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await navigateAndWait(page, '/your-page');

    await expect(page.locator('h1')).toBeVisible();

    // Your test logic
  });
});
```

### Authenticated Test Template

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Protected Feature', () => {
  test('should access protected feature', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/protected-page');

    // Your test logic with authenticated user
  });
});
```

## Best Practices

1. **Use helpers**: Leverage navigation, form, and environment helpers
2. **Fixtures for auth**: Use `authenticatedPage` fixture for tests requiring login
3. **Selectors**: Prefer data-testid over text or CSS selectors
4. **Waits**: Use `waitForSelector` and `waitForURL` instead of arbitrary timeouts
5. **Cleanup**: Tests should be independent and not rely on execution order
6. **Screenshots**: Taken automatically on failures
7. **Videos**: Recorded on retry for debugging

## Troubleshooting

### Tests failing locally?

1. Check dev server is running: `npm run dev`
2. Verify environment variables are set
3. Clear browser cache: `npx playwright test --clear-cache`
4. Update browsers: `npx playwright install chromium`

### Flaky tests?

1. Check for race conditions
2. Add explicit waits for dynamic content
3. Use `waitForLoadState('networkidle')` for API-heavy pages
4. Increase timeouts for slow operations

### Need to debug?

```bash
# Run single test in debug mode
npx playwright test tests/e2e/auth/login.spec.ts --debug

# Use headed mode to see browser
npx playwright test --headed --slowmo=1000
```

## Performance

- **Local execution**: ~8 minutes (parallel)
- **CI execution**: ~12 minutes (matrix, 2 shards)
- **Screenshot storage**: Auto-deleted after 7 days
- **Video storage**: Auto-deleted after 7 days
- **Reports**: Kept for 30 days

## Maintenance

### Regular tasks

- Update test data when schema changes
- Add tests for new features
- Review flaky tests monthly
- Update selectors if UI changes
- Keep Playwright version current: `npm update @playwright/test`

### When tests fail in CI

1. Check GitHub Actions artifacts for screenshots/videos
2. Review the HTML report
3. Run locally to reproduce
4. Fix root cause (not just test)
5. Consider adding regression test

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
