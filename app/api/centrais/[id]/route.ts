import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  buscarCentralPorId,
  atualizarCentral,
  confirmarCentral,
} from "@/lib/services/central.service"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const central = await buscarCentralPorId(id)
    if (!central) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json(central)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  // Identificar peça deixa de ser privilégio de admin: quem está na bancada é
  // quem sabe o que é a peça, e a fila de identificação é trabalho dela.
  if (!session?.user?.perfis?.length) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  const { id } = await params
  try {
    const body = await req.json()
    // `confirmar: true` promove rascunho a item de catálogo.
    const central = body?.confirmar
      ? await confirmarCentral(id, body)
      : await atualizarCentral(id, body)
    if (!central) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json(central)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao atualizar central"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
