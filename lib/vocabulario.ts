/**
 * Vocabulário passado ao transcritor como dica de contexto.
 *
 * Curto de propósito: o prompt do Whisper tem teto de ~224 tokens e lista longa
 * DEGRADA o resultado em vez de melhorar. Entra só o jargão que um modelo
 * genérico erra: siglas de módulo, fabricantes de ECU e os carros mais comuns
 * na bancada.
 */
const TERMOS = [
  // módulos e sistemas
  "ECU",
  "ABS",
  "4GV",
  "body computer",
  "imobilizador",
  "injeção eletrônica",
  "corpo de borboleta",
  "TPS",
  "sensor de rotação",
  "painel de instrumentos",
  "airbag",
  "chicote",
  // fabricantes
  "Bosch",
  "Delphi",
  "Magneti Marelli",
  "Siemens",
  "Continental",
  // códigos de família
  "EDC16",
  "ME17",
  "MT80",
  "IAW",
  // carros
  "Gol",
  "Palio",
  "Uno",
  "Celta",
  "Corsa",
]

/**
 * O prompt do Whisper funciona como "contexto do que vem antes", não como lista
 * de regras — então é escrito como frase, não como enumeração.
 */
export function promptTranscricao(): string {
  return `Laboratório de eletrônica automotiva. Termos usados: ${TERMOS.join(", ")}.`
}

export { TERMOS }
