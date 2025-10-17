import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Exclude /auth/callback and /api routes from i18n middleware
  matcher: ['/', '/(en|es)/:path*', '/((?!_next|_vercel|api|auth/callback|.*\\..*).*)'],
};
