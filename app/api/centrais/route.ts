import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { listarCentrais, criarCentral } from "@/lib/services/central.service"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? undefined
  const centrais = await listarCentrais(q)
  return NextResponse.json(centrais)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.perfis?.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  try {
    const body = await req.json()
    const central = await criarCentral(body)
    return NextResponse.json(central, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao criar central"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
