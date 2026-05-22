import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { buscarEstatisticas } from "@/lib/services/dashboard.service"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  try {
    const dados = await buscarEstatisticas()
    return NextResponse.json(dados)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
