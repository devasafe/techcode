import { NextResponse, after } from "next/server"
import { timingSafeEqual } from "crypto"
import { assinaturaConfere } from "@/lib/whatsapp/assinatura"
import { webhookSchema, extrairMensagens } from "@/lib/schemas/whatsapp"
import {
  registrarEvento,
  processarPayload,
  marcarProcessado,
  marcarErro,
} from "@/lib/services/webhook.service"

/**
 * Webhook da WhatsApp Cloud API.
 *
 * ⚠️ ESTA ROTA É PÚBLICA. O matcher do `middleware.ts` exclui `/api`, então
 * nenhum guard central roda aqui — a validação do HMAC abaixo é a ÚNICA
 * proteção. Qualquer mudança neste arquivo precisa manter isso em mente.
 *
 * Limite de 1 MB no corpo e nada do payload é registrado em log quando a
 * assinatura não confere: logar requisição não autenticada é vetor de flood.
 */

const LIMITE_CORPO = 1024 * 1024

/** Verificação do endpoint: a Meta chama com GET e espera o challenge de volta. */
export async function GET(req: Request) {
  const esperado = process.env.WHATSAPP_VERIFY_TOKEN
  if (!esperado) {
    return NextResponse.json({ error: "Webhook não configurado" }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token") ?? ""
  const challenge = searchParams.get("hub.challenge") ?? ""

  if (mode !== "subscribe" || !segredoConfere(token, esperado)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  // Precisa ser text/plain com o challenge cru; JSON faz a Meta recusar.
  return new Response(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  })
}

export async function POST(req: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (!appSecret) {
    return NextResponse.json({ error: "Webhook não configurado" }, { status: 503 })
  }

  const tamanho = Number(req.headers.get("content-length") ?? 0)
  if (tamanho > LIMITE_CORPO) {
    return NextResponse.json({ error: "Corpo muito grande" }, { status: 413 })
  }

  // req.text(), NUNCA req.json(): o HMAC é sobre o corpo cru, e reserializar
  // quebra a assinatura. É o erro número um desta integração.
  const corpoCru = await req.text()
  if (corpoCru.length > LIMITE_CORPO) {
    return NextResponse.json({ error: "Corpo muito grande" }, { status: 413 })
  }

  if (!assinaturaConfere(corpoCru, req.headers.get("x-hub-signature-256"), appSecret)) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 })
  }

  let payload
  try {
    payload = webhookSchema.parse(JSON.parse(corpoCru))
  } catch {
    // Responde 200 de propósito: payload que não entendemos não deve fazer a
    // Meta reentregar o mesmo evento por 7 dias.
    return NextResponse.json({ ignorado: true }, { status: 200 })
  }

  const mensagens = extrairMensagens(payload)
  if (!mensagens.length) {
    // Status de entrega, reação, etc. Chega e é ignorado.
    return NextResponse.json({ ignorado: true }, { status: 200 })
  }

  // Deduplica pelo id da primeira mensagem antes de processar qualquer coisa.
  const primeira = mensagens[0]
  const { novo, evento_id } = await registrarEvento(primeira.mensagem.id, {
    wa_id: primeira.wa_id,
    tipo: primeira.mensagem.type,
    payload,
  })

  if (!novo) {
    // Já visto: 200 imediato, sem reprocessar.
    return NextResponse.json({ duplicado: true }, { status: 200 })
  }

  // 200 rápido (a Meta espera menos de 5s) e o trabalho vai para depois. Se o
  // `after` morrer com o container, o evento está guardado e o sweeper retoma.
  after(async () => {
    try {
      await processarPayload(payload)
      if (evento_id) await marcarProcessado(evento_id)
    } catch (err) {
      if (evento_id) {
        await marcarErro(evento_id, err instanceof Error ? err.message : "erro desconhecido")
      }
    }
  })

  return NextResponse.json({ recebido: true }, { status: 200 })
}

function segredoConfere(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  // timingSafeEqual lança se os tamanhos diferem.
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}
