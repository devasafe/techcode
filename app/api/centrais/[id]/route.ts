import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { buscarCentralPorId, atualizarCentral } from "@/lib/services/central.service"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params
  const central = await buscarCentralPorId(id)
  if (!central) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json(central)
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.perfis?.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { id } = await params
  try {
    const body = await req.json()
    const central = await atualizarCentral(id, body)
    if (!central) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json(central)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao atualizar central"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
