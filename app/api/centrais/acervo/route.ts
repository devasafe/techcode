import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { buscarAcervo } from "@/lib/services/central.service"

/** Busca no acervo de peças que já passaram pela bancada. */
export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  try {
    const itens = await buscarAcervo(searchParams.get("q") ?? undefined, {
      incluirRascunhos: searchParams.get("rascunhos") === "1",
    })
    return NextResponse.json(itens)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
