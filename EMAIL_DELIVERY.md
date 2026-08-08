# ScoreGPT email delivery requirements

The `scoregpt.com.ng` domain is verified in Resend for outbound sending. DKIM and SPF are verified, sending is enabled, and inbound email receiving is intentionally disabled. Batch 4C does not integrate Resend or add credentials.

## Secret and sender configuration

- `RESEND_API_KEY` must be a server-only environment variable. It must never use a `NEXT_PUBLIC_` prefix or appear in browser code, source control, logs, screenshots, or client bundles.
- The approved From identity should use the verified `scoregpt.com.ng` domain, for example `ScoreGPT <no-reply@scoregpt.com.ng>`, after confirming that exact sender convention in Resend.
- In Vercel, store the key as an encrypted environment variable scoped separately to Development/Preview and Production. Never copy a Development credential into Production by assumption.
- Resend API calls must live in server-only modules, route handlers, server actions, or background jobs. Client components call an authenticated ScoreGPT server boundary, never Resend directly.

## Supabase Auth email ownership

Supabase Auth should continue owning security-sensitive identity messages because it generates and validates the confirmation/recovery tokens:

- account confirmation;
- password recovery;
- email-change confirmation;
- magic-link or OTP messages if enabled later.

For branded Auth messages, configure Supabase Auth custom SMTP with Resend SMTP credentials. Keep the canonical redirect URLs in Supabase Auth configuration, including `https://scoregpt.com.ng/auth/callback`. Local callback URLs should be allow-listed only for Development.

## ScoreGPT application email ownership

The Resend HTTP API is appropriate for future application notifications that do not issue Supabase identity tokens, such as:

- membership and billing receipts after a trusted server-side payment event;
- prediction/report availability notifications;
- account or product notifications;
- operational/admin notifications.

Each email needs a versioned transactional template, plain-text alternative, accessible HTML, canonical ScoreGPT links, an explicit support identity, and delivery/audit handling that never stores secrets or authentication tokens in logs. Marketing email would additionally require consent and unsubscribe handling; it is outside this checkpoint.

## Not implemented

No Resend SDK, SMTP credential, API route, template, webhook, or environment value is introduced here. Live confirmation and password-reset delivery remains part of the owner's manual Batch 4B verification.
