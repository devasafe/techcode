import mongoose, { Schema, Document } from "mongoose"

/**
 * Registro de evento de webhook recebido.
 *
 * Existe por um motivo específico: a Meta REENTREGA o mesmo evento por até 7
 * dias quando não recebe 200. Sem deduplicação por `message_id`, um evento mal
 * processado viraria sete dias de clientes duplicados.
 *
 * Também serve de fila de retentativa: se o processamento falhar, o payload
 * está guardado e o sweeper tenta de novo — sem depender do retry da Meta, que
 * só cobre "não recebi 200", não "recebi mas quebrei".
 */
export interface IWebhookEvento extends Document {
  provider: string
  /** Id da mensagem no provedor. Único — é a chave de deduplicação. */
  message_id: string
  wa_id?: string
  tipo?: string
  payload: unknown
  recebido_em: Date
  processado_em?: Date
  tentativas: number
  erro?: string
}

const WebhookEventoSchema = new Schema<IWebhookEvento>({
  provider: { type: String, required: true, default: "whatsapp" },
  message_id: { type: String, required: true, unique: true },
  wa_id: String,
  tipo: String,
  payload: { type: Schema.Types.Mixed },
  recebido_em: { type: Date, default: Date.now },
  processado_em: Date,
  tentativas: { type: Number, default: 0 },
  erro: String,
})

// O Atlas M0 tem 0,5 GB e o payload cru é o que enche. Evento processado sai
// depois de 30 dias.
WebhookEventoSchema.index({ processado_em: 1 }, { expireAfterSeconds: 2592000 })
// Para o sweeper achar o que falhou.
WebhookEventoSchema.index({ processado_em: 1, tentativas: 1 })

export default mongoose.models.WebhookEvento ||
  mongoose.model<IWebhookEvento>("WebhookEvento", WebhookEventoSchema)
