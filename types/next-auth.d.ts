import "next-auth"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    perfis: string[]
  }
  interface Session {
    user: {
      id: string
      perfis: string[]
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    perfis: string[]
  }
}
