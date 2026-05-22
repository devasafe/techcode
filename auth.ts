import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { connectDB } from "@/lib/db"
import Usuario from "@/models/Usuario"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email" },
        senha: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.senha) return null

        await connectDB()
        const user = await Usuario.findOne({
          email: credentials.email,
          ativo: true,
        })

        if (!user) return null

        const senhaCorreta = await bcrypt.compare(
          credentials.senha as string,
          user.senha
        )
        if (!senhaCorreta) return null

        return {
          id: user._id.toString(),
          name: user.nome,
          email: user.email,
          perfis: user.perfis,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.perfis = user.perfis
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.perfis = token.perfis as string[]
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
})
