---
name: Lost-and-found auth and storage
description: Authentication and persistence choices for the school lost-and-found app.
---

The lost-and-found app uses one server-seeded admin account from `ADMIN_EMAIL` and `ADMIN_PASSWORD`; the password is stored as a scrypt hash and sessions are HTTP-only cookies.

**Why:** The school requested a direct temporary admin login instead of an external identity-provider flow, while keeping the password out of source and frontend bundles.

**How to apply:** Keep admin credentials in Replit Secrets/environment configuration, never seed or display the plaintext password from application code, and keep all create, edit, delete, status, and upload routes behind the session middleware.