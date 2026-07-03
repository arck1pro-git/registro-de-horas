import type { NextAuthConfig } from "next-auth";

// Config base compartilhada — segura para o Edge (proxy).
// Os providers que precisam de Node ficam em auth.ts.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdmin = auth?.user?.role === "admin";
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");

      if (isOnLogin) {
        if (isLoggedIn) {
          // Admin cai direto no painel; usuário comum na home.
          return Response.redirect(new URL(isAdmin ? "/admin" : "/", nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) return false;

      // Admin vive no painel: qualquer rota fora de /admin volta pra lá.
      if (isAdmin) {
        if (!isOnAdmin) {
          return Response.redirect(new URL("/admin", nextUrl));
        }
        return true;
      }

      // Usuário comum não acessa /admin.
      if (isOnAdmin) {
        return Response.redirect(new URL("/", nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      session.user.role = token.role;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
