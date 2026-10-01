/**
 * Gravação de áudio no navegador.
 *
 * O formato NÃO é o mesmo em toda plataforma: Android Chrome produz
 * `audio/webm;codecs=opus`, e o Safari do iPhone produz `audio/mp4` (AAC) —
 * ele não suporta webm. Por isso nada aqui é fixo: testamos o que o aparelho
 * aceita e mandamos o mimeType real junto com o arquivo.
 *
 * O Groq (transcrição da Fase 2) aceita webm e mp4 direto, então essa variação
 * não exige converter nada no servidor.
 */
const CANDIDATOS = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/mpeg",
]

export function gravacaoSuportada(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  )
}

export function escolherMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined
  for (const tipo of CANDIDATOS) {
    try {
      if (MediaRecorder.isTypeSupported(tipo)) return tipo
    } catch {
      // isTypeSupported pode lançar em navegador antigo
    }
  }
  return undefined // deixa o navegador escolher
}

export function extensaoDoMime(mime: string | undefined): string {
  if (!mime) return "webm"
  if (mime.includes("mp4")) return "m4a"
  if (mime.includes("mpeg")) return "mp3"
  if (mime.includes("ogg")) return "ogg"
  return "webm"
}

export function formatarDuracao(segundos: number): string {
  const m = Math.floor(segundos / 60)
  const s = Math.floor(segundos % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

/** Corte duro: acima disso o arquivo passa do limite de áudio do WhatsApp. */
export const DURACAO_MAXIMA_S = 120
