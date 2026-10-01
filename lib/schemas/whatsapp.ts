import { z } from "zod"

/**
 * Schema do webhook da Meta, TOLERANTE de propósito.
 *
 * A Meta adiciona campos sem avisar e envia tipos de evento que não nos
 * interessam (status de entrega, reações, etc). Rejeitar o que não conhecemos
 * faria o endpoint devolver erro, e erro faz a Meta reentregar o mesmo evento
 * por 7 dias. Então: validamos o que usamos e ignoramos o resto em silêncio.
 */

const perfilSchema = z.object({ name: z.unknown().optional() }).passthrough()

/** Contato compartilhado (vCard). É o caminho de cadastro sem coexistência. */
const contatoSchema = z
  .object({
    name: z
      .object({
        formatted_name: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
      })
      .passthrough()
      .optional(),
    phones: z
      .array(
        z
          .object({
            phone: z.string().optional(),
            wa_id: z.string().optional(),
            type: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough()

const mensagemSchema = z
  .object({
    id: z.string(),
    from: z.string().optional(),
    timestamp: z.string().optional(),
    type: z.string().optional(),
    text: z.object({ body: z.string().optional() }).passthrough().optional(),
    image: z
      .object({ id: z.string().optional(), mime_type: z.string().optional() })
      .passthrough()
      .optional(),
    audio: z
      .object({
        id: z.string().optional(),
        mime_type: z.string().optional(),
        voice: z.boolean().optional(),
        /** Liberado gradualmente desde nov/2025; ainda exige o token no download. */
        url: z.string().optional(),
      })
      .passthrough()
      .optional(),
    contacts: z.array(contatoSchema).optional(),
  })
  .passthrough()

const valueSchema = z
  .object({
    messaging_product: z.string().optional(),
    metadata: z
      .object({
        display_phone_number: z.string().optional(),
        phone_number_id: z.string().optional(),
      })
      .passthrough()
      .optional(),
    contacts: z
      .array(z.object({ wa_id: z.string().optional(), profile: perfilSchema.optional() }).passthrough())
      .optional(),
    messages: z.array(mensagemSchema).optional(),
    /** Status de entrega: chega e é ignorado. */
    statuses: z.array(z.unknown()).optional(),
  })
  .passthrough()

export const webhookSchema = z
  .object({
    object: z.string().optional(),
    entry: z
      .array(
        z
          .object({
            id: z.string().optional(),
            changes: z
              .array(z.object({ field: z.string().optional(), value: valueSchema.optional() }).passthrough())
              .optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough()

export type WebhookPayload = z.infer<typeof webhookSchema>
export type MensagemWhatsApp = z.infer<typeof mensagemSchema>
export type ContatoCompartilhado = z.infer<typeof contatoSchema>

/** Achata o payload em mensagens, cada uma com o nome de perfil do remetente. */
export function extrairMensagens(payload: WebhookPayload) {
  const saida: {
    mensagem: MensagemWhatsApp
    wa_id?: string
    nome_perfil?: unknown
    phone_number_id?: string
  }[] = []

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value
      if (!value?.messages?.length) continue

      // `contacts` traz o perfil de quem enviou, na mesma notificação.
      const contato = value.contacts?.[0]
      for (const mensagem of value.messages) {
        saida.push({
          mensagem,
          wa_id: contato?.wa_id ?? mensagem.from,
          nome_perfil: contato?.profile?.name,
          phone_number_id: value.metadata?.phone_number_id,
        })
      }
    }
  }

  return saida
}
