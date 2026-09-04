---
name: Lost-and-found auth and storage
description: Authentication and persistence choices for the school lost-and-found app.
---

The first successfully authenticated account is promoted to the administrator; later authenticated accounts remain student accounts and cannot mutate lost-item records.

**Why:** The app needs a usable initial admin without putting a password or credential in source code, while still keeping ordinary student accounts read-only.

**How to apply:** Preserve the administrator flag when changing auth/session payloads, and keep all create, edit, delete, status, and upload routes behind both authentication and administrator checks.