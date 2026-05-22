import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { connectDB } from "@/lib/db"
import Usuario from "@/models/Usuario"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
          perfis: Array.from(user.perfis as string[]),
        }
      },
    }),
  ],
})
