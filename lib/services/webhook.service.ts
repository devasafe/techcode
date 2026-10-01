import { connectDB } from "@/lib/db"
import WebhookEvento from "@/models/WebhookEvento"
import { obterOuCriarClientePorTelefone } from "./cliente.service"
import { sanitizarNomePerfil } from "@/lib/whatsapp/assinatura"
import { extrairMensagens, type WebhookPayload } from "@/lib/schemas/whatsapp"

export type ResultadoRegistro = { novo: boolean; evento_id?: string }

/**
 * Registra o evento ANTES de processar, para deduplicar.
 *
 * `message_id` é único: se o insert colide, já vimos esse evento e a resposta
 * é 200 na hora. A Meta reentrega por 7 dias quando não recebe 200, e sem isso
 * um erro de processamento viraria uma semana de duplicatas.
 */
export async function registrarEvento(
  message_id: string,
  dados: { wa_id?: string; tipo?: string; payload: unknown }
): Promise<ResultadoRegistro> {
  await connectDB()
  try {
    const evento = await WebhookEvento.create({
      provider: "whatsapp",
      message_id,
      wa_id: dados.wa_id,
      tipo: dados.tipo,
      payload: dados.payload,
    })
    return { novo: true, evento_id: String(evento._id) }
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { novo: false }
    throw err
  }
}

/**
 * Cria clientes a partir de uma notificação.
 *
 * Dois caminhos, porque há dois jeitos de o cadastro chegar:
 *
 *  - mensagem comum: quem escreveu vira cliente (`wa_id` + nome do perfil).
 *    É o cadastro 100% automático, que depende de coexistência.
 *  - contato compartilhado (`type: "contacts"`): o nome e o telefone vêm no
 *    payload. Funciona com número dedicado, SEM coexistência — é o caminho que
 *    não depende de aprovação da Meta.
 */
export async function processarPayload(payload: WebhookPayload) {
  await connectDB()

  const criados: { telefone: string; nome?: string; via: "mensagem" | "contato" }[] = []

  for (const item of extrairMensagens(payload)) {
    const { mensagem, wa_id, nome_perfil } = item

    // Contato compartilhado: cada contato do array vira um cliente.
    if (mensagem.type === "contacts" && mensagem.contacts?.length) {
      for (const contato of mensagem.contacts) {
        const telefone = contato.phones?.[0]?.wa_id ?? contato.phones?.[0]?.phone
        if (!telefone) continue
        const nome = sanitizarNomePerfil(
          contato.name?.formatted_name ??
            [contato.name?.first_name, contato.name?.last_name].filter(Boolean).join(" ")
        )
        try {
          await obterOuCriarClientePorTelefone(telefone, {
            nome,
            origem: "whatsapp",
            nome_whatsapp: nome,
          })
          criados.push({ telefone, nome, via: "contato" })
        } catch {
          // Telefone que não normaliza (número curto, internacional): ignora
          // esse contato e segue com os outros.
        }
      }
      continue
    }

    // Mensagem comum: quem mandou vira cliente.
    if (!wa_id) continue
    const nome = sanitizarNomePerfil(nome_perfil)
    try {
      await obterOuCriarClientePorTelefone(wa_id, {
        // `nome` entra como sugestão: o upsert nunca sobrescreve nome que um
        // humano confirmou, justamente porque o perfil do WhatsApp é mutável.
        nome,
        origem: "whatsapp",
        nome_whatsapp: nome,
      })
      criados.push({ telefone: wa_id, nome, via: "mensagem" })
    } catch {
      // idem
    }
  }

  return { criados }
}

export async function marcarProcessado(evento_id: string) {
  await connectDB()
  return WebhookEvento.findByIdAndUpdate(
    evento_id,
    { $set: { processado_em: new Date(), erro: undefined } },
    { returnDocument: "after" }
  )
}

export async function marcarErro(evento_id: string, erro: string) {
  await connectDB()
  return WebhookEvento.findByIdAndUpdate(
    evento_id,
    { $set: { erro: erro.slice(0, 300) }, $inc: { tentativas: 1 } },
    { returnDocument: "after" }
  )
}

/** Eventos que chegaram e não foram processados — a fila de retentativa. */
export async function listarNaoProcessados(limite = 10) {
  await connectDB()
  return WebhookEvento.find({ processado_em: { $exists: false }, tentativas: { $lt: 3 } })
    .sort({ recebido_em: 1 })
    .limit(limite)
    .lean()
}
