import { promptTranscricao } from "./vocabulario"

/**
 * Transcrição de áudio. A interface é agnóstica de propósito: trocar de
 * provedor é trocar uma env, não reescrever o chamador.
 *
 * O Groq é o padrão por ELIMINAR DEPENDÊNCIA, não por preço: aceita webm, mp4 e
 * ogg/opus direto — ou seja os dois formatos que os navegadores produzem (Android
 * dá webm, iPhone dá mp4) e o do WhatsApp (ogg), sem precisar de ffmpeg no
 * container. A OpenAI não aceita ogg e exigiria o binário.
 */

export type ResultadoTranscricao = {
  texto: string
  provedor: string
  modelo: string
}

/** Distingue "tente de novo" de "não insista" — o sweeper usa isso. */
export class ErroTranscricao extends Error {
  constructor(
    message: string,
    readonly reenfileirar: boolean
  ) {
    super(message)
    this.name = "ErroTranscricao"
  }
}

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
const MODELO_PADRAO = "whisper-large-v3-turbo"

export function transcricaoConfigurada(): boolean {
  return Boolean(process.env.GROQ_API_KEY)
}

export async function transcrever(
  bytes: Buffer | Uint8Array,
  opcoes: { mime?: string; nomeArquivo?: string } = {}
): Promise<ResultadoTranscricao> {
  const chave = process.env.GROQ_API_KEY
  if (!chave) {
    throw new ErroTranscricao("GROQ_API_KEY não configurada", false)
  }

  const modelo = process.env.TRANSCRICAO_MODELO || MODELO_PADRAO
  const mime = opcoes.mime || "audio/webm"
  const nome = opcoes.nomeArquivo || `audio.${extensaoDe(mime)}`

  const form = new FormData()
  form.set("file", new Blob([new Uint8Array(bytes)], { type: mime }), nome)
  form.set("model", modelo)
  form.set("language", "pt")
  form.set("response_format", "json")
  form.set("prompt", promptTranscricao())

  let res: Response
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}` },
      body: form,
    })
  } catch (err) {
    // Rede: vale tentar de novo depois.
    throw new ErroTranscricao(
      `falha de rede ao transcrever: ${err instanceof Error ? err.message : "desconhecida"}`,
      true
    )
  }

  if (!res.ok) {
    const corpo = await res.text().catch(() => "")
    // 429 (cota/limite) e 5xx passam; 400/401/413 são definitivos e insistir
    // só queima crédito e enche o log.
    const reenfileirar = res.status === 429 || res.status >= 500
    throw new ErroTranscricao(
      `transcritor respondeu ${res.status}${corpo ? `: ${corpo.slice(0, 200)}` : ""}`,
      reenfileirar
    )
  }

  const dados = (await res.json()) as { text?: string }
  const texto = (dados.text ?? "").trim()
  if (!texto) {
    // Áudio em branco ou só ruído: não é erro para repetir.
    throw new ErroTranscricao("transcritor devolveu texto vazio", false)
  }

  return { texto, provedor: "groq", modelo }
}

/** Busca os bytes da mídia já hospedada, em vez de carregar buffer na memória. */
export async function baixarMidia(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new ErroTranscricao(`não deu para baixar a mídia (${res.status})`, res.status >= 500)
  }
  return Buffer.from(await res.arrayBuffer())
}

function extensaoDe(mime: string): string {
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a"
  if (mime.includes("ogg") || mime.includes("opus")) return "ogg"
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3"
  if (mime.includes("wav")) return "wav"
  return "webm"
}
