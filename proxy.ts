import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Convenção "proxy" do Next 16 (substitui o antigo "middleware").
export default NextAuth(authConfig).auth;

export const config = {
  // Protege todas as rotas exceto assets, api de auth e arquivos estáticos.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
