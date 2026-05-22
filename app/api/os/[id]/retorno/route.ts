import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { adicionarRetornoGarantia } from "@/lib/services/os.service"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const body = await req.json()
    const os = await adicionarRetornoGarantia(id, body)
    if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 })
    return NextResponse.json(os)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao registrar retorno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
