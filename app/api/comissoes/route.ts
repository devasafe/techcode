import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { listarComissoes } from "@/lib/services/comissao.service"
import type { Periodo, ComissaoFiltros } from "@/lib/services/comissao.service"

const PERIODOS_VALIDOS: Periodo[] = ["este_mes", "mes_anterior", "este_ano", "tudo"]

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (!session.user?.perfis?.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const filtros: ComissaoFiltros = {}
  const tecnico_id = searchParams.get("tecnico_id")
  if (tecnico_id) filtros.tecnico_id = tecnico_id
  const periodo = searchParams.get("periodo") as Periodo | null
  if (periodo && PERIODOS_VALIDOS.includes(periodo)) filtros.periodo = periodo
  try {
    const dados = await listarComissoes(filtros)
    return NextResponse.json(dados)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
