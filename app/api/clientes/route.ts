import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { listarClientes, criarCliente } from "@/lib/services/cliente.service"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? undefined
  try {
    const clientes = await listarClientes(q)
    return NextResponse.json(clientes)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.perfis?.some((p) => ["admin", "atendente"].includes(p))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  try {
    const body = await req.json()
    const cliente = await criarCliente(body)
    return NextResponse.json(cliente, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao criar cliente"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
