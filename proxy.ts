import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Convenção "proxy" do Next 16 (substitui o antigo "middleware").
export default NextAuth(authConfig).auth;

export const config = {
  // Protege todas as rotas exceto a API e arquivos estáticos (qualquer caminho
  // com extensão: .js do service worker, .webmanifest, ícones .png, etc.).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
