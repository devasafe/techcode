import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { buscarRelatorioFinanceiro } from "@/lib/services/dashboard.service"
import type { Periodo } from "@/lib/services/dashboard.service"

const PERIODOS_VALIDOS: Periodo[] = ["este_mes", "mes_anterior", "este_ano", "tudo"]

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (!session.user?.perfis?.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const periodo = (searchParams.get("periodo") ?? "este_mes") as Periodo
  if (!PERIODOS_VALIDOS.includes(periodo)) {
    return NextResponse.json({ error: "Período inválido" }, { status: 400 })
  }
  try {
    const dados = await buscarRelatorioFinanceiro(periodo)
    return NextResponse.json(dados)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
