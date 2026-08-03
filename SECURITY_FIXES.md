# Security Fixes Applied

## Applied
- Removed the real `.env` file from the distributable project.
- Added `.env`, `.env.*`, and private assets to `.gitignore`.
- Added a safe `.env.example` containing variable names only.
- Moved `public/downloads/busniss-projects.zip` to `private-assets/downloads/` so it is not deployed as a public asset.
- Replaced dynamic `innerHTML` use in marketing pixels with `textContent`.
- Added strict validation for all marketing pixel identifiers before interpolation.
- URL-encoded identifiers used in external script URLs.
- Added `SameSite=Lax` and conditional `Secure` to the sidebar preference cookie.

## Still Requires Manual Review
- Supabase RLS policies and all `SECURITY DEFINER` functions.
- Authentication and admin authorization flows.
- Storage bucket policies and file upload validation.
- Stripe webhook signature verification and payment business logic.
- Rotation of any credentials that were previously committed or shared.

These changes reduce identified exposure but do not constitute a complete security certification.

## Final hardening pass — 2026-07-14

- Removed wildcard CORS from privileged `/api/admin/*` responses; admin APIs are now same-origin only.
- Added strict Zod validation to security administration operations (IP addresses, UUIDs, severity values, reasons, durations, and wallet limits).
- Added logical validation that a per-transaction wallet limit cannot exceed the daily limit.
- Added JSON content-type enforcement and a 16 KiB declared body-size cap to the public client telemetry endpoint.
- Added no-store and bounded preflight caching headers for privileged API responses.
