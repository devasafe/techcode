import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { sugestoesSaida } from "@/lib/services/os.service"

/** Chips de serviço e valor, derivados do histórico do próprio laboratório. */
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  try {
    return NextResponse.json(await sugestoesSaida())
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
