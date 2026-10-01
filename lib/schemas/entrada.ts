import { z } from "zod"

/**
 * Primeiro uso de zod no projeto. Entra só nas rotas novas: as 20 antigas
 * seguem validando pelo Mongoose, e trocar isso agora seria mexer no que
 * funciona sem necessidade.
 */
export const entradaSchema = z
  .object({
    cliente_id: z.string().min(1).optional(),
    telefone: z.string().min(1).optional(),
    nome: z.string().max(120).optional(),
    central_id: z.string().min(1).optional(),
    apelido_peca: z.string().max(160).optional(),
    defeito: z.string().max(2000).optional(),
    tipo_cliente: z.enum(["mecanico", "usuario"]).optional(),
    chave_idempotencia: z.string().min(8).max(100).optional(),
  })
  .refine((d) => Boolean(d.cliente_id || d.telefone), {
    message: "Informe o cliente ou o telefone",
    path: ["telefone"],
  })

export type EntradaPayload = z.infer<typeof entradaSchema>

/** Limites alinhados com o WhatsApp (Fase 5), para o mesmo arquivo servir aos dois. */
export const LIMITE_FOTO_BYTES = 8 * 1024 * 1024
export const LIMITE_AUDIO_BYTES = 16 * 1024 * 1024
