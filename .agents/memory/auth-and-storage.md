---
name: Lost-and-found auth and storage
description: Authentication and persistence choices for the school lost-and-found app.
---

The lost-and-found app uses one server-seeded admin account from `ADMIN_EMAIL` and `ADMIN_PASSWORD`; the password is stored as a scrypt hash and sessions are HTTP-only cookies.

**Why:** The school requested a direct temporary admin login instead of an external identity-provider flow, while keeping the password out of source and frontend bundles.

**How to apply:** Keep admin credentials in Replit Secrets/environment configuration, never seed or display the plaintext password from application code, and keep all create, edit, delete, status, and upload routes behind the session middleware.

New photos are uploaded directly to Replit Object Storage through a short-lived signed URL; PostgreSQL stores only the `/objects/...` path.

**Why:** Base64 image payloads can exceed Express limits and make production persistence depend on API request size; direct object storage keeps the database and API payloads small.

**How to apply:** Keep upload URL issuance administrator-only, validate image metadata and size before signing, and serve stored paths through short-lived signed download redirects.

The OpenAPI document must include every schema imported from the generated API package, not only newly added routes.

**Why:** Orval cleans generated output; regenerating from a partial specification removes existing authentication schemas and breaks the API build.

**How to apply:** Add shared auth and domain schemas to the OpenAPI contract before running code generation, then run the workspace typecheck.

`ADMIN_PASSWORD` is the source of truth for the configured administrator: on API startup, a changed secret updates its stored hash and revokes existing sessions.

**Why:** The original one-time account bootstrap otherwise made a forgotten or rotated secret ineffective after the first account creation.

**How to apply:** Password resets must use Replit Secrets and restart the API; never ask the user to send the new password in chat.