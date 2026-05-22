import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { listarOS, listarOSFila, criarOS } from "@/lib/services/os.service"
import type { OSStatus } from "@/types"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  try {
    if (searchParams.get("fila") === "true") {
      const os = await listarOSFila()
      return NextResponse.json(os)
    }
    const status = (searchParams.get("status") ?? undefined) as OSStatus | undefined
    const cliente_id = searchParams.get("cliente_id") ?? undefined
    const os = await listarOS({ status, cliente_id })
    return NextResponse.json(os)
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
    const os = await criarOS(body)
    return NextResponse.json(os, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao criar OS"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
