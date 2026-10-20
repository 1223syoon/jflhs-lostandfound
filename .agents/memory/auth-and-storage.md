---
name: Lost-and-found auth and storage
description: Authentication and persistence choices for the school lost-and-found app.
---

The lost-and-found app uses one server-verified four-digit PIN from the `ADMIN_PIN` secret; the PIN is never included in the frontend bundle, and successful logins create HTTP-only database-backed sessions.

**Why:** The school requested a simple numeric administrator login instead of email accounts, while keeping the credential server-side and preserving the existing session-based authorization model.

**How to apply:** Configure `ADMIN_PIN` as a server-side secret, never place it in source or `VITE_*` variables, and keep all create, edit, delete, status, and upload routes behind the session middleware. Leave legacy `admin_accounts` records untouched unless the user explicitly requests their removal.

New photos are uploaded directly to Replit Object Storage through a short-lived signed URL; PostgreSQL stores only the `/objects/...` path.

**Why:** Base64 image payloads can exceed Express limits and make production persistence depend on API request size; direct object storage keeps the database and API payloads small.

**How to apply:** Keep upload URL issuance administrator-only, validate image metadata and size before signing, and serve stored paths through short-lived signed download redirects.

The OpenAPI document must include every schema imported from the generated API package, not only newly added routes.

**Why:** Orval cleans generated output; regenerating from a partial specification removes existing authentication schemas and breaks the API build.

**How to apply:** Add shared auth and domain schemas to the OpenAPI contract before running code generation, then run the workspace typecheck.
