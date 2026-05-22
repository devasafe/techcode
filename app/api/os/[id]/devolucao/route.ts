import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { registrarDevolucao } from "@/lib/services/os.service"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (!session.user?.perfis?.some((p) => ["admin", "atendente"].includes(p))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { id } = await params
  try {
    const body = await req.json()
    const os = await registrarDevolucao(id, body)
    if (!os) return NextResponse.json({ error: "OS não encontrada ou não está concluída" }, { status: 404 })
    return NextResponse.json(os)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao registrar devolução"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
