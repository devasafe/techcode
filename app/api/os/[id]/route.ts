import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { buscarOSPorId, atualizarOS } from "@/lib/services/os.service"
import { gerarComissao } from "@/lib/services/comissao.service"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const os = await buscarOSPorId(id)
    if (!os) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json(os)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const body = await req.json()
    const os = await atualizarOS(id, body)
    if (!os) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    if (body.status === "concluida" && body.tecnico_id) {
      try {
        await gerarComissao(id, body.tecnico_id)
      } catch {
        // falha na comissão não reverte conclusão da OS
      }
    }
    return NextResponse.json(os)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao atualizar OS"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
