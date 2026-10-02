---
name: OpenAPI and Zod compatibility
description: The current API generator emits a Zod 4-only helper for OpenAPI integer schemas.
---

Orval 8.23 generates `zod.int()` for OpenAPI fields declared as `type: integer`, while the workspace currently uses Zod 3, which does not provide that helper. For generated response properties that only need a JSON numeric type, use `type: number` and describe the integral unit; otherwise, update the generator/Zod compatibility deliberately.

**Why:** Regenerating the API contract can pass code generation but fail the library TypeScript build.

**How to apply:** After editing OpenAPI schemas, run code generation and the library typecheck; do not hand-edit generated files to mask the mismatch.