import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { marcarComoPago } from "@/lib/services/comissao.service"

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (!session.user?.perfis?.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { id } = await params
  try {
    const comissao = await marcarComoPago(id)
    if (!comissao) return NextResponse.json({ error: "Comissão não encontrada" }, { status: 404 })
    return NextResponse.json(comissao)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao registrar pagamento"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
