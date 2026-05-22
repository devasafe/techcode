import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.perfis = (user as { perfis?: string[] }).perfis ?? []
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.perfis = token.perfis as string[]
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig
