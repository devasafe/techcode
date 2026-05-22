import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  buscarUsuarioPorId,
  atualizarUsuario,
  desativarUsuario,
} from "@/lib/services/usuario.service"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user.perfis.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { id } = await params
  const usuario = await buscarUsuarioPorId(id)
  if (!usuario) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json(usuario)
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user.perfis.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const usuario = await atualizarUsuario(id, body)
  if (!usuario) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json(usuario)
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user.perfis.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { id } = await params
  await desativarUsuario(id)
  return NextResponse.json({ ok: true })
}
