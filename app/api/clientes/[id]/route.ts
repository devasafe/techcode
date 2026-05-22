import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { buscarClientePorId, atualizarCliente } from "@/lib/services/cliente.service"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const cliente = await buscarClientePorId(id)
    if (!cliente) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json(cliente)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.perfis?.some((p) => ["admin", "atendente"].includes(p))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { id } = await params
  try {
    const body = await req.json()
    const cliente = await atualizarCliente(id, body)
    if (!cliente) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json(cliente)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao atualizar cliente"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
