import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { listarCentrais, criarCentral } from "@/lib/services/central.service"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? undefined
  const incluirRascunhos = searchParams.get("rascunhos") === "1"
  try {
    const centrais = await listarCentrais(q, { incluirRascunhos })
    return NextResponse.json(centrais)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  // Qualquer perfil cria peça: exigir admin travava a bancada quando chegava
  // peça nova, que é o caso comum, não a exceção.
  if (!session?.user?.perfis?.length) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  try {
    const body = await req.json()
    const central = await criarCentral({ ...body, criado_por: session.user.id })
    return NextResponse.json(central, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao criar central"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
