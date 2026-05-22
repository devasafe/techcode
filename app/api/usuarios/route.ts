import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { listarUsuarios, criarUsuario } from "@/lib/services/usuario.service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.perfis?.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const usuarios = await listarUsuarios()
  return NextResponse.json(usuarios)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.perfis?.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  try {
    const body = await req.json()
    const usuario = await criarUsuario(body)
    return NextResponse.json(usuario, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
