import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"

const ROTAS_ADMIN = ["/financeiro", "/equipe"]

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const logado = !!req.auth

  if (!logado && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (logado && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  const rotaAdmin = ROTAS_ADMIN.some((r) => pathname.startsWith(r))
  const ehAdmin = req.auth?.user?.perfis?.includes("admin")

  if (rotaAdmin && !ehAdmin) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
