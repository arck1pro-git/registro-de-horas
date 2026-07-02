import type { Role } from "@/lib/data";

// Adiciona `role` ao usuário da sessão e ao token JWT.
declare module "@auth/core/types" {
  interface User {
    role?: Role;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role;
  }
}
