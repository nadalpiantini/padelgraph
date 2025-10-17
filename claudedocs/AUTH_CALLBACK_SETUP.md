# Auth Callback Setup - Production Configuration

## Problem Solved
Fixed "Email link is invalid or has expired" error by implementing proper auth callback handler.

## What Was Missing
No `/auth/callback` route to handle email confirmation links from Supabase Auth.

## Implementation

### 1. Created Callback Handler
**File**: `/src/app/auth/callback/route.ts`

Handles:
- Email confirmation links
- OAuth callbacks
- Code exchange for session
- Error handling and redirects

### 2. Updated Auth Page
**File**: `/src/app/[locale]/auth/page.tsx`

Added:
- Error message display from callback
- Query param handling for errors

## Supabase Dashboard Configuration

### Required Settings (Production)

**Navigate to**: Supabase Dashboard → Authentication → URL Configuration

#### Site URL
Set to your production domain:
```
https://padelgraph.com
```
(Or your Vercel deployment URL if custom domain not configured)

#### Redirect URLs
Add all valid redirect URLs (whitelist):
```
https://padelgraph.com/auth/callback
https://padelgraph.com/**
https://*.vercel.app/auth/callback
https://*.vercel.app/**
http://localhost:3000/auth/callback (for local development)
http://localhost:3000/**
```

### Email Settings

**Navigate to**: Supabase Dashboard → Authentication → Email Templates

#### Confirm signup template
Ensure the action link uses:
```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup
```

Default template should work, but verify the path is `/auth/callback`.

#### Magic link template
```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink
```

## Testing Checklist

### Local Testing
- [ ] User signup sends email
- [ ] Email link redirects to `http://localhost:3000/auth/callback`
- [ ] Callback exchanges code for session
- [ ] User redirected to home page
- [ ] User session persists

### Production Testing
- [ ] User signup sends email
- [ ] Email link redirects to `https://padelgraph.com/auth/callback`
- [ ] Callback exchanges code for session
- [ ] User redirected to home page
- [ ] User session persists
- [ ] SSL/HTTPS working correctly

## Environment Variables

### Required (already configured)
```env
NEXT_PUBLIC_SUPABASE_URL=https://kqftsiohgdzlyfqbhxbc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Vercel Environment Variables
Ensure these are set in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Troubleshooting

### "Email link is invalid or has expired"
**Cause**: OTP token expired (default 1 hour)
**Solution**:
1. Request new confirmation email
2. Click link within 1 hour
3. Optional: Increase `otp_expiry` in Supabase config (not recommended for security)

### "Missing authentication code"
**Cause**: Email link doesn't contain code/token
**Solution**: Check email template configuration in Supabase Dashboard

### "Exchange failed"
**Cause**: Invalid code or session already created
**Solution**:
1. Check Supabase logs
2. Verify redirect URLs are whitelisted
3. Try requesting new confirmation email

### Callback redirects to wrong domain
**Cause**: Site URL misconfigured
**Solution**: Verify Site URL in Supabase Dashboard matches production domain

## Security Notes

- OTP tokens expire after 1 hour (configurable)
- Email confirmations disabled in local development (see `supabase/config.toml`)
- Rate limiting: 2 emails per hour (configurable in `config.toml`)
- Always use HTTPS in production
- Redirect URLs are whitelisted for security

## Next Steps

After deployment:
1. Test full signup flow in production
2. Monitor Supabase logs for auth errors
3. Verify email delivery (check spam folder)
4. Test with real email addresses
