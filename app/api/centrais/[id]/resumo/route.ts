import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { resumoDaCentral } from "@/lib/services/central.service"

/**
 * Resumo da gaveta da central.
 *
 * Rota nova e aditiva de propósito: `/api/centrais/[id]/reparos` devolve um
 * array e a página consome a forma direto, então mexer nela quebraria a tela.
 *
 * O dinheiro é omitido NO SERVIDOR para quem não é admin — esconder no CSS
 * deixaria o número viajando na resposta.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.perfis?.length) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  const { id } = await params

  try {
    const resumo = await resumoDaCentral(id)
    const ehAdmin = session.user.perfis.includes("admin")
    if (!ehAdmin) {
      const { receita, custo, lucro, ...semDinheiro } = resumo
      void receita
      void custo
      void lucro
      return NextResponse.json(semDinheiro)
    }
    return NextResponse.json(resumo)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
