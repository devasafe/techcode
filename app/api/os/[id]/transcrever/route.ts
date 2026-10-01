import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { connectDB } from "@/lib/db"
import OS, { type IOS } from "@/models/OS"
import {
  processarTranscricao,
  corrigirTranscricao,
  marcarFalha,
} from "@/lib/services/midia.service"
import { transcricaoConfigurada } from "@/lib/transcricao"

/**
 * Transcrever sob demanda. Serve para quando a pessoa quer o texto na hora, ou
 * para repetir depois de uma falha — sem esperar o cron de 5 minutos.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.perfis?.length) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  if (!transcricaoConfigurada()) {
    return NextResponse.json(
      { error: "Transcrição automática não está configurada" },
      { status: 503 }
    )
  }

  const { id } = await params

  try {
    await connectDB()
    const os = (await OS.findById(id)) as IOS | null
    if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 })

    const audios = (os.midias ?? []).filter((m) => m.tipo === "audio")
    if (!audios.length) {
      return NextResponse.json({ error: "Esta OS não tem áudio" }, { status: 400 })
    }

    const resultados: { midia_id: string; ok: boolean; motivo?: string }[] = []
    for (const m of audios) {
      const midia_id = String(m._id)
      // "falhou" precisa voltar para "pendente" antes, senão o claim não pega.
      if (m.transcricao?.status === "falhou") {
        await marcarFalha(id, midia_id, "retentativa manual", true)
      }
      const r = await processarTranscricao(id, midia_id)
      resultados.push({ midia_id, ok: r.processou, motivo: r.processou ? undefined : r.motivo })
    }

    const atualizada = (await OS.findById(id)) as IOS | null
    return NextResponse.json({
      resultados,
      midias: (atualizada?.midias ?? []).map((m) => ({
        _id: String(m._id),
        tipo: m.tipo,
        transcricao: m.transcricao,
      })),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao transcrever"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

/**
 * Correção humana do texto. Guarda o original junto, porque as correções são o
 * que permite melhorar o vocabulário com dado em vez de palpite.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.perfis?.length) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params

  try {
    const { midia_id, texto } = await req.json()
    if (!midia_id || typeof texto !== "string" || !texto.trim()) {
      return NextResponse.json({ error: "midia_id e texto são obrigatórios" }, { status: 400 })
    }
    const os = await corrigirTranscricao(id, midia_id, texto, session.user.id)
    if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao corrigir"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
