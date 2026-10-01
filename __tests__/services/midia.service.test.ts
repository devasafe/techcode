import {
  claimTranscricao,
  salvarTranscricao,
  marcarFalha,
  reenfileirarTravadas,
  listarPendentes,
  corrigirTranscricao,
  MAX_TENTATIVAS,
} from "@/lib/services/midia.service"
import OS from "@/models/OS"
import Central from "@/models/Central"

async function criarOSComAudio(
  opts: {
    defeito?: string
    status?: string
    tentativas?: number
    papel?: "peca" | "defeito"
    apelidoPeca?: string
  } = {}
) {
  const central = await Central.create({ apelido: opts.apelidoPeca ?? "Peça teste" })
  const os = await OS.create({
    cliente_id: "507f1f77bcf86cd799439011",
    central_id: central._id,
    defeito_descricao: opts.defeito,
    midias: [
      {
        tipo: "audio",
        ...(opts.papel ? { papel: opts.papel } : {}),
        url: "https://res.cloudinary.test/audio.webm",
        public_id: "techcode/os/x/audio",
        resource_type: "video",
        mime: "audio/webm",
        tamanho: 1000,
        origem: "camera",
        transcricao: {
          status: opts.status ?? "pendente",
          tentativas: opts.tentativas ?? 0,
        },
      },
    ],
  })
  return { os, central, midia_id: String(os.midias[0]._id) }
}

describe("claimTranscricao", () => {
  it("marca como processando e conta a tentativa", async () => {
    const { os, midia_id } = await criarOSComAudio()
    const atualizada = await claimTranscricao(String(os._id), midia_id)
    expect(atualizada).not.toBeNull()
    const m = atualizada!.midias[0]
    expect(m.transcricao.status).toBe("processando")
    expect(m.transcricao.tentativas).toBe(1)
    expect(m.transcricao.claim_at).toBeInstanceOf(Date)
  })

  it("SO UM vence quando dois processos tentam ao mesmo tempo", async () => {
    const { os, midia_id } = await criarOSComAudio()
    const [a, b] = await Promise.all([
      claimTranscricao(String(os._id), midia_id),
      claimTranscricao(String(os._id), midia_id),
    ])
    const vencedores = [a, b].filter(Boolean)
    expect(vencedores).toHaveLength(1)

    // E a tentativa foi contada uma vez só: nao houve trabalho (nem cobranca) em dobro.
    const final = await OS.findById(os._id)
    expect(final!.midias[0].transcricao.tentativas).toBe(1)
  })

  it("nao pega midia que ja esta processando", async () => {
    const { os, midia_id } = await criarOSComAudio({ status: "processando" })
    expect(await claimTranscricao(String(os._id), midia_id)).toBeNull()
  })

  it("nao pega midia que esgotou as tentativas", async () => {
    const { os, midia_id } = await criarOSComAudio({ tentativas: MAX_TENTATIVAS })
    expect(await claimTranscricao(String(os._id), midia_id)).toBeNull()
  })
})

describe("salvarTranscricao", () => {
  it("grava o texto na midia com a proveniencia", async () => {
    const { os, midia_id } = await criarOSComAudio()
    await salvarTranscricao(String(os._id), midia_id, {
      texto: "painel de Gol 2010, chicote diferente",
      provedor: "groq",
      modelo: "whisper-large-v3-turbo",
    })
    const final = await OS.findById(os._id)
    const t = final!.midias[0].transcricao
    expect(t.status).toBe("concluida")
    expect(t.texto).toBe("painel de Gol 2010, chicote diferente")
    expect(t.provedor).toBe("groq")
    expect(t.modelo).toBe("whisper-large-v3-turbo")
  })

  it("NUNCA sobrescreve o defeito que a pessoa digitou", async () => {
    const { os, midia_id } = await criarOSComAudio({ defeito: "nao liga, escrito por humano" })
    await salvarTranscricao(String(os._id), midia_id, {
      texto: "texto da maquina",
      provedor: "groq",
      modelo: "m",
    })
    const final = await OS.findById(os._id)
    expect(final!.defeito_descricao).toBe("nao liga, escrito por humano")
    expect(final!.defeito_transcrito).toBe("texto da maquina")
  })

  it("alimenta os termos de busca da peca (base do acervo)", async () => {
    const { os, central, midia_id } = await criarOSComAudio()
    await salvarTranscricao(String(os._id), midia_id, {
      texto: "modulo 4GV UF queimado",
      provedor: "groq",
      modelo: "m",
    })
    const c = await Central.findById(central._id)
    expect(c!.termos_busca).toContain("4GV UF")
  })
})

describe("marcarFalha", () => {
  it("volta para pendente quando vale tentar de novo", async () => {
    const { os, midia_id } = await criarOSComAudio({ status: "processando" })
    await marcarFalha(String(os._id), midia_id, "429 limite", true)
    const final = await OS.findById(os._id)
    expect(final!.midias[0].transcricao.status).toBe("pendente")
    expect(final!.midias[0].transcricao.erro).toContain("429")
  })

  it("vira falhou quando nao vale insistir", async () => {
    const { os, midia_id } = await criarOSComAudio({ status: "processando" })
    await marcarFalha(String(os._id), midia_id, "400 audio invalido", false)
    const final = await OS.findById(os._id)
    expect(final!.midias[0].transcricao.status).toBe("falhou")
  })
})

describe("reenfileirarTravadas", () => {
  it("devolve a fila o que ficou preso (container caiu no meio)", async () => {
    const { os, midia_id } = await criarOSComAudio({ status: "processando" })
    // Claim de 10 minutos atras: o processo que pegou nao existe mais.
    await OS.findByIdAndUpdate(os._id, {
      $set: { "midias.$[m].transcricao.claim_at": new Date(Date.now() - 10 * 60 * 1000) },
    }, { arrayFilters: [{ "m._id": os.midias[0]._id }] })

    expect(await reenfileirarTravadas(5)).toBe(1)
    const final = await OS.findById(os._id)
    expect(final!.midias[0].transcricao.status).toBe("pendente")
    expect(midia_id).toBeTruthy()
  })

  it("NAO mexe em claim recente (ainda pode estar rodando)", async () => {
    const { os } = await criarOSComAudio({ status: "processando" })
    await OS.findByIdAndUpdate(os._id, {
      $set: { "midias.$[m].transcricao.claim_at": new Date() },
    }, { arrayFilters: [{ "m._id": os.midias[0]._id }] })

    expect(await reenfileirarTravadas(5)).toBe(0)
    const final = await OS.findById(os._id)
    expect(final!.midias[0].transcricao.status).toBe("processando")
  })
})

describe("listarPendentes", () => {
  it("lista audio pendente e ignora o que esgotou tentativas", async () => {
    await criarOSComAudio()
    await criarOSComAudio({ tentativas: MAX_TENTATIVAS })
    const fila = await listarPendentes()
    expect(fila).toHaveLength(1)
  })

  it("ignora foto", async () => {
    const central = await Central.create({ apelido: "p" })
    await OS.create({
      cliente_id: "507f1f77bcf86cd799439011",
      central_id: central._id,
      midias: [
        {
          tipo: "foto",
          url: "u",
          public_id: "p",
          resource_type: "image",
          origem: "camera",
        },
      ],
    })
    expect(await listarPendentes()).toHaveLength(0)
  })
})

describe("corrigirTranscricao", () => {
  it("guarda o texto original para alimentar o vocabulario depois", async () => {
    const { os, midia_id } = await criarOSComAudio()
    await salvarTranscricao(String(os._id), midia_id, {
      texto: "modulo quatro ge ve",
      provedor: "groq",
      modelo: "m",
    })
    await corrigirTranscricao(String(os._id), midia_id, "modulo 4GV")

    const final = await OS.findById(os._id)
    const t = final!.midias[0].transcricao
    expect(t.texto).toBe("modulo 4GV")
    expect(t.texto_original).toBe("modulo quatro ge ve")
    expect(final!.defeito_transcrito).toBe("modulo 4GV")
  })
})

describe("papel do audio: peca vs defeito", () => {
  // O problema real: "749 Peugeot, defeito de capacitor" num audio so punha o
  // modelo da central no campo de defeito. Dois papeis separam isso.
  it("audio de PECA nomeia a peca e nao toca no defeito", async () => {
    const { os, central, midia_id } = await criarOSComAudio({
      papel: "peca",
      apelidoPeca: "Peça #99",
    })
    await salvarTranscricao(String(os._id), midia_id, {
      texto: "749 Peugeot",
      provedor: "groq",
      modelo: "m",
    })

    const c = await Central.findById(central._id)
    expect(c!.apelido).toBe("749 Peugeot")

    const final = await OS.findById(os._id)
    expect(final!.defeito_transcrito).toBeUndefined()
  })

  it("audio de DEFEITO preenche o defeito e nao renomeia a peca", async () => {
    const { os, central, midia_id } = await criarOSComAudio({
      papel: "defeito",
      apelidoPeca: "Peça #99",
    })
    await salvarTranscricao(String(os._id), midia_id, {
      texto: "defeito de capacitor",
      provedor: "groq",
      modelo: "m",
    })

    const final = await OS.findById(os._id)
    expect(final!.defeito_transcrito).toBe("defeito de capacitor")

    const c = await Central.findById(central._id)
    expect(c!.apelido).toBe("Peça #99")
  })

  it("NAO sobrescreve nome de peca escrito por gente", async () => {
    const { os, central, midia_id } = await criarOSComAudio({
      papel: "peca",
      apelidoPeca: "painel Gol 2010 cinza",
    })
    await salvarTranscricao(String(os._id), midia_id, {
      texto: "texto da maquina",
      provedor: "groq",
      modelo: "m",
    })
    const c = await Central.findById(central._id)
    expect(c!.apelido).toBe("painel Gol 2010 cinza")
  })

  it("audio antigo sem papel continua valendo como defeito", async () => {
    // Compatibilidade: a OS que ja existia foi gravada antes do campo `papel`.
    const { os, midia_id } = await criarOSComAudio({ apelidoPeca: "Peça #99" })
    await salvarTranscricao(String(os._id), midia_id, {
      texto: "749 Peugeot, defeito de capacitor",
      provedor: "groq",
      modelo: "m",
    })
    const final = await OS.findById(os._id)
    expect(final!.defeito_transcrito).toBe("749 Peugeot, defeito de capacitor")
  })

  it("os dois audios alimentam a busca do acervo", async () => {
    const { os, central, midia_id } = await criarOSComAudio({ papel: "peca" })
    await salvarTranscricao(String(os._id), midia_id, {
      texto: "modulo 4GV UF",
      provedor: "groq",
      modelo: "m",
    })
    const c = await Central.findById(central._id)
    expect(c!.termos_busca).toContain("4GV UF")
  })
})
