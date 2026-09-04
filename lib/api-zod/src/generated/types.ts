import * as zod from "zod";

export const AuthUser = zod.object({
  id: zod.string(),
  email: zod.string().nullable(),
  firstName: zod.string().nullable(),
  lastName: zod.string().nullable(),
  profileImageUrl: zod.string().nullable(),
  isAdmin: zod.boolean(),
});
export type AuthUser = zod.infer<typeof AuthUser>;