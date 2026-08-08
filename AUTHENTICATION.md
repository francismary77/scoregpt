# ScoreGPT authentication configuration

Batch 4B keeps `AuthService` and `AuthProvider` as the application boundary and configures `SupabaseAuthProvider` for real accounts. Supabase SSR clients synchronize secure session cookies; protected server pages validate the user with `auth.getUser()` before rendering. Profiles, memberships and usage are read through repository contracts, never directly from page components.

## Development configuration

Set these values in ignored `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_DATA_REPOSITORY=supabase
NEXT_PUBLIC_AUTH_PROVIDER=supabase
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Mock authentication is selected only when `NEXT_PUBLIC_AUTH_PROVIDER=mock` is explicitly set. If Supabase mode lacks its public configuration, authentication reports unavailable and never silently activates demo identities.

In Supabase Authentication URL Configuration:

- Site URL: `http://localhost:3000`
- Redirect URLs: add `http://localhost:3000/auth/callback` and `http://localhost:3000/reset-password`.
- If the local server uses another port, add the equivalent exact callback and reset URLs for that port.
- Keep email confirmation enabled or disabled according to the intended Development test. The UI correctly handles both immediate sessions and confirmation-required signups.

For confirmation templates using token hashes, point links to `/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard`. The standard PKCE confirmation callback is `/auth/callback?next=/dashboard`.

Apply `supabase/migrations/202608080001_batch_4b_auth_hardening.sql` to Development before allowance testing. It records UI fixture identifiers, prevents duplicate usage events and removes anonymous execution permission from the admin helper.

## Production configuration

The canonical production origin is `https://scoregpt.com.ng`.

1. Set `https://scoregpt.com.ng` as the Supabase Site URL.
2. Add `https://scoregpt.com.ng/auth/callback` and `https://scoregpt.com.ng/reset-password` as exact redirect URLs.
3. Set `NEXT_PUBLIC_SITE_URL=https://scoregpt.com.ng` in the production environment.
4. Add only Vercel preview URL patterns that genuinely need authentication testing; previews otherwise return authentication callbacks to the canonical production domain.
5. Configure the public Supabase values in Vercel and keep all secret/service-role credentials server-only.
6. Apply reviewed migrations to the Production Supabase project through the migration workflow, not dashboard-only edits.

Password-reset and confirmation links never display tokens in ScoreGPT UI or logs. Safe return paths accept same-origin relative paths only.
