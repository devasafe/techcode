import { createHmac, timingSafeEqual } from "crypto"

/**
 * Validação da assinatura `X-Hub-Signature-256` da Meta.
 *
 * Duas armadilhas conhecidas desta integração estão tratadas aqui:
 *
 * 1. O HMAC é calculado sobre o corpo CRU. Quem faz `req.json()` e reserializa
 *    muda espaços e ordem de chaves, e a assinatura nunca bate. Por isso esta
 *    função recebe string, não objeto.
 *
 * 2. `timingSafeEqual` LANÇA quando os buffers têm tamanhos diferentes. Sem
 *    checar o tamanho antes, um header malformado (ou ausente) viraria 500 em
 *    vez de 401 — e um 500 repetido faz a Meta reentregar o evento por dias.
 */
export function assinaturaConfere(
  corpoCru: string,
  headerAssinatura: string | null,
  appSecret: string
): boolean {
  if (!headerAssinatura || !appSecret) return false

  const prefixo = "sha256="
  if (!headerAssinatura.startsWith(prefixo)) return false

  const recebida = headerAssinatura.slice(prefixo.length).trim()
  if (!/^[a-f0-9]{64}$/i.test(recebida)) return false

  const esperada = createHmac("sha256", appSecret).update(corpoCru, "utf8").digest("hex")

  const a = Buffer.from(recebida.toLowerCase(), "utf8")
  const b = Buffer.from(esperada.toLowerCase(), "utf8")
  if (a.length !== b.length) return false

  return timingSafeEqual(a, b)
}

/**
 * O nome do perfil do WhatsApp é escolhido pelo próprio usuário: pode vir
 * vazio, mudar a qualquer momento, conter caractere de controle ou ser
 * enganoso de propósito. Nunca é identificador — o `wa_id` é.
 */
export function sanitizarNomePerfil(nome: unknown): string | undefined {
  if (typeof nome !== "string") return undefined
  // eslint-disable-next-line no-control-regex
  const limpo = nome.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim()
  if (!limpo) return undefined
  return limpo.slice(0, 80)
}
