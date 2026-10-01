import { NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import {
  listarPendentes,
  reenfileirarTravadas,
  processarTranscricao,
} from "@/lib/services/midia.service"
import { transcricaoConfigurada } from "@/lib/transcricao"

/**
 * Rede de segurança da transcrição. O caminho normal é o `after()` da rota de
 * entrada; isto existe porque `after()` morre com o container — e o Coolify
 * derruba o container a cada push, com grace period de 10s.
 *
 * ATENÇÃO: o matcher do middleware exclui `/api`, então esta rota é PÚBLICA.
 * O header `x-job-secret` é o único guard.
 *
 * Agendar no Coolify (Scheduled Tasks), a cada 5 minutos:
 *   curl -X POST -H "x-job-secret: $JOB_SECRET" https://teccode.satriz.club/api/jobs/transcrever
 */
export async function POST(req: Request) {
  const esperado = process.env.JOB_SECRET
  if (!esperado) {
    return NextResponse.json({ error: "JOB_SECRET não configurado" }, { status: 503 })
  }

  const recebido = req.headers.get("x-job-secret") ?? ""
  if (!segredoConfere(recebido, esperado)) {
    // Sem detalhar o motivo e sem registrar o corpo: é endpoint aberto.
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  if (!transcricaoConfigurada()) {
    return NextResponse.json({ error: "GROQ_API_KEY não configurada" }, { status: 503 })
  }

  try {
    const reenfileiradas = await reenfileirarTravadas()
    const fila = await listarPendentes(10) // teto por execução

    let concluidas = 0
    let falhas = 0
    for (const item of fila) {
      const r = await processarTranscricao(item.os_id, item.midia_id)
      if (r.processou) concluidas++
      else falhas++
    }

    return NextResponse.json({ reenfileiradas, tentadas: fila.length, concluidas, falhas })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro no job"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function segredoConfere(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  // timingSafeEqual LANÇA se os tamanhos diferem — checar antes, senão um
  // header malformado virava 500 em vez de 401.
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}
