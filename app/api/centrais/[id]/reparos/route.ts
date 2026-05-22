import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { listarReparosDaCentral } from "@/lib/services/central.service"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const reparos = await listarReparosDaCentral(id)
    return NextResponse.json(reparos)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
