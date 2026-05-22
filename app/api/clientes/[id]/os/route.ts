import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { listarOSDoCliente } from "@/lib/services/cliente.service"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const os = await listarOSDoCliente(id)
    return NextResponse.json(os)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
