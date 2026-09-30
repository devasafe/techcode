/**
 * Normalização de telefone brasileiro para E.164.
 *
 * Existe porque o telefone é a chave de deduplicação de cliente: o mesmo número
 * chega como "11999990000", "(11) 99999-0000" ou "+55 11 99999-0000" e tem de
 * virar um único cliente.
 */

const DDI_BR = "55"

/**
 * Devolve o número em E.164 (`+5511999990000`) ou `null` se não der para
 * afirmar que é um telefone brasileiro válido.
 */
export function normalizarE164(bruto: string | null | undefined): string | null {
  if (!bruto) return null

  let d = String(bruto).replace(/\D/g, "")
  if (!d) return null

  // Zeros de discagem internacional/interurbana ("0055...", "011...").
  d = d.replace(/^0+/, "")
  if (d.startsWith(DDI_BR) && (d.length === 12 || d.length === 13)) {
    d = d.slice(2)
  }

  // Sobrou DDD (2) + assinante (8 fixo | 9 celular).
  if (d.length !== 10 && d.length !== 11) return null

  const ddd = d.slice(0, 2)
  if (Number(ddd) < 11) return null // não existe DDD abaixo de 11

  let assinante = d.slice(2)

  // Celular antigo de 8 dígitos: a Anatel prefixou o 9 em 2016. Assinante
  // começando em 6-9 era celular; fixo começa em 2-5.
  if (assinante.length === 8 && /^[6-9]/.test(assinante)) {
    assinante = "9" + assinante
  }

  // Celular de 9 dígitos tem de começar com 9.
  if (assinante.length === 9 && !assinante.startsWith("9")) return null

  return `+${DDI_BR}${ddd}${assinante}`
}

/** `+5511999990000` → `(11) 99999-0000`. Usado como nome de cliente sem nome. */
export function formatarBR(e164: string | null | undefined): string {
  if (!e164) return ""
  const d = String(e164).replace(/\D/g, "").replace(/^55/, "")
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return String(e164)
}

/** Heurística para a UI: o que foi digitado parece um telefone e não um nome? */
export function parecTelefone(q: string): boolean {
  const digitos = q.replace(/\D/g, "")
  return digitos.length >= 8 && digitos.length >= q.trim().length - 4
}
