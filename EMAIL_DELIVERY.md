# 9ja Football AI email delivery requirements

The public product domain is now `9jafootballai.com.ng`. This rebrand does not configure Resend, SMTP, credentials, or live email delivery. Before production email is enabled, the new domain must be verified with the chosen sender and the required DNS records must be confirmed. Any prior sender configuration is historical infrastructure and must not be used for new customer-facing messages.

## Secret and sender configuration

- `RESEND_API_KEY` must be a server-only environment variable. It must never use a `NEXT_PUBLIC_` prefix or appear in browser code, source control, logs, screenshots, or client bundles.
- After the new domain is verified, use an approved From identity such as `9ja Football AI <no-reply@9jafootballai.com.ng>`.
- In Vercel, store the key as an encrypted environment variable scoped separately to Development/Preview and Production. Never copy a Development credential into Production by assumption.
- Resend API calls must live in server-only modules, route handlers, server actions, or background jobs. Client components call an authenticated 9ja Football AI server boundary, never Resend directly.

## Supabase Auth email ownership

Supabase Auth should continue owning security-sensitive identity messages because it generates and validates the confirmation/recovery tokens:

- account confirmation;
- password recovery;
- email-change confirmation;
- magic-link or OTP messages if enabled later.

For branded Auth messages, configure Supabase Auth custom SMTP only after the new sender domain is verified. Keep the canonical redirect URLs in Supabase Auth configuration, including `https://9jafootballai.com.ng/auth/callback`. Local callback URLs should be allow-listed only for Development.

## 9ja Football AI application email ownership

The Resend HTTP API is appropriate for future application notifications that do not issue Supabase identity tokens, such as:

- membership and billing receipts after a trusted server-side payment event;
- prediction/report availability notifications;
- account or product notifications;
- operational/admin notifications.

Each email needs a versioned transactional template, plain-text alternative, accessible HTML, canonical 9ja Football AI links, an explicit support identity, and delivery/audit handling that never stores secrets or authentication tokens in logs. Marketing email would additionally require consent and unsubscribe handling; it is outside this checkpoint.

## Not implemented

No Resend SDK, SMTP credential, API route, template, webhook, or environment value is introduced here. Live confirmation and password-reset delivery remains an owner-controlled manual verification step.
