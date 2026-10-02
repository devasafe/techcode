import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { medirAdocao } from "@/lib/services/dashboard.service"

/** Medição de uso real do sistema. Admin só: é número de gestão. */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.perfis?.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const dias = Math.min(Math.max(Number(searchParams.get("dias") ?? 14), 1), 90)
  try {
    return NextResponse.json(await medirAdocao(dias))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
