import { transcrever, baixarMidia, ErroTranscricao, transcricaoConfigurada } from "@/lib/transcricao"
import { promptTranscricao } from "@/lib/vocabulario"

const fetchOriginal = global.fetch

function mockFetch(resposta: { ok?: boolean; status?: number; json?: unknown; text?: string }) {
  const fn = jest.fn().mockResolvedValue({
    ok: resposta.ok ?? true,
    status: resposta.status ?? 200,
    json: async () => resposta.json ?? {},
    text: async () => resposta.text ?? "",
    arrayBuffer: async () => new ArrayBuffer(8),
  })
  global.fetch = fn as unknown as typeof fetch
  return fn
}

describe("transcrever", () => {
  const CHAVE = process.env.GROQ_API_KEY

  beforeEach(() => {
    process.env.GROQ_API_KEY = "gsk_teste"
  })

  afterEach(() => {
    global.fetch = fetchOriginal
    if (CHAVE === undefined) delete process.env.GROQ_API_KEY
    else process.env.GROQ_API_KEY = CHAVE
  })

  it("devolve o texto e a proveniencia", async () => {
    mockFetch({ json: { text: "  painel de Gol 2010  " } })
    const r = await transcrever(Buffer.from("audio"), { mime: "audio/webm" })
    expect(r.texto).toBe("painel de Gol 2010")
    expect(r.provedor).toBe("groq")
    expect(r.modelo).toBe("whisper-large-v3-turbo")
  })

  it("manda o vocabulario e o idioma", async () => {
    const fn = mockFetch({ json: { text: "ok" } })
    await transcrever(Buffer.from("audio"))
    const body = fn.mock.calls[0][1].body as FormData
    expect(body.get("language")).toBe("pt")
    expect(body.get("prompt")).toBe(promptTranscricao())
    expect(String(body.get("prompt"))).toContain("4GV")
  })

  it("429 pode tentar de novo", async () => {
    mockFetch({ ok: false, status: 429, text: "rate limit" })
    await expect(transcrever(Buffer.from("a"))).rejects.toMatchObject({ reenfileirar: true })
  })

  it("500 pode tentar de novo", async () => {
    mockFetch({ ok: false, status: 503, text: "indisponivel" })
    await expect(transcrever(Buffer.from("a"))).rejects.toMatchObject({ reenfileirar: true })
  })

  it("400 NAO deve ser repetido (queimaria credito de graca)", async () => {
    mockFetch({ ok: false, status: 400, text: "audio invalido" })
    await expect(transcrever(Buffer.from("a"))).rejects.toMatchObject({ reenfileirar: false })
  })

  it("401 NAO deve ser repetido", async () => {
    mockFetch({ ok: false, status: 401, text: "chave invalida" })
    await expect(transcrever(Buffer.from("a"))).rejects.toMatchObject({ reenfileirar: false })
  })

  it("texto vazio nao e erro para repetir (audio em branco)", async () => {
    mockFetch({ json: { text: "   " } })
    await expect(transcrever(Buffer.from("a"))).rejects.toMatchObject({ reenfileirar: false })
  })

  it("falha de rede pode tentar de novo", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("ECONNRESET")) as unknown as typeof fetch
    await expect(transcrever(Buffer.from("a"))).rejects.toMatchObject({ reenfileirar: true })
  })

  it("sem chave configurada falha sem reenfileirar", async () => {
    delete process.env.GROQ_API_KEY
    await expect(transcrever(Buffer.from("a"))).rejects.toMatchObject({
      reenfileirar: false,
      message: expect.stringContaining("GROQ_API_KEY"),
    })
  })

  it("usa a extensao certa para cada formato de celular", async () => {
    const fn = mockFetch({ json: { text: "ok" } })
    await transcrever(Buffer.from("a"), { mime: "audio/mp4" }) // iPhone
    let f = (fn.mock.calls[0][1].body as FormData).get("file") as File
    expect(f.name).toBe("audio.m4a")

    const fn2 = mockFetch({ json: { text: "ok" } })
    await transcrever(Buffer.from("a"), { mime: "audio/ogg; codecs=opus" }) // WhatsApp
    f = (fn2.mock.calls[0][1].body as FormData).get("file") as File
    expect(f.name).toBe("audio.ogg")
  })
})

describe("transcricaoConfigurada", () => {
  it("reflete a presenca da chave", () => {
    const antes = process.env.GROQ_API_KEY
    delete process.env.GROQ_API_KEY
    expect(transcricaoConfigurada()).toBe(false)
    process.env.GROQ_API_KEY = "x"
    expect(transcricaoConfigurada()).toBe(true)
    if (antes === undefined) delete process.env.GROQ_API_KEY
    else process.env.GROQ_API_KEY = antes
  })
})

describe("baixarMidia", () => {
  afterEach(() => {
    global.fetch = fetchOriginal
  })

  it("404 nao deve ser repetido", async () => {
    mockFetch({ ok: false, status: 404 })
    await expect(baixarMidia("https://x/y.webm")).rejects.toMatchObject({ reenfileirar: false })
  })

  it("502 pode ser repetido", async () => {
    mockFetch({ ok: false, status: 502 })
    await expect(baixarMidia("https://x/y.webm")).rejects.toMatchObject({ reenfileirar: true })
  })

  it("erro e do tipo ErroTranscricao", async () => {
    mockFetch({ ok: false, status: 404 })
    await expect(baixarMidia("https://x/y.webm")).rejects.toBeInstanceOf(ErroTranscricao)
  })
})
