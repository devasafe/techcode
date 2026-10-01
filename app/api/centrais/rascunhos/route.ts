import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  listarRascunhosComContexto,
  contarRascunhos,
} from "@/lib/services/central.service"

/** A fila de peças a identificar, já com fotos e áudios para dar contexto. */
export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { searchParams } = new URL(req.url)

  try {
    // ?contar=1 serve ao badge da navegação, sem carregar tudo.
    if (searchParams.get("contar") === "1") {
      return NextResponse.json({ total: await contarRascunhos() })
    }
    return NextResponse.json(await listarRascunhosComContexto())
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
