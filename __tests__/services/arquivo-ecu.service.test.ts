jest.mock("@/lib/storage", () => require("../mocks/storage"))

import {
  anexarArquivoECU,
  listarPorOS,
  listarPorCentral,
  listarPorCliente,
  removerArquivoECU,
  nomeParaDownload,
} from "@/lib/services/arquivo-ecu.service"
import ArquivoECU from "@/models/ArquivoECU"
import OS from "@/models/OS"
import Central from "@/models/Central"
import Cliente from "@/models/Cliente"
import { guardados, removidos, limpar } from "../mocks/storage"

async function cenario(opts: { modelo?: string; cliente?: string } = {}) {
  const central = await Central.create({
    marca: "Bosch",
    modelo: opts.modelo ?? "ME 7.4.9",
    codigo: "0261S04",
    status_catalogo: "confirmada",
  })
  const cliente = await Cliente.create({
    nome: opts.cliente ?? "Ze Eletrica",
    telefone: "(22) 99988-7766",
    telefone_e164: `+552299988${String(Math.floor(Math.random() * 9000) + 1000)}`,
  })
  const os = await OS.create({ cliente_id: cliente._id, central_id: central._id })
  return { central, cliente, os }
}

const bin = (conteudo = "binario-de-ecu") => Buffer.from(conteudo)

describe("anexarArquivoECU", () => {
  beforeEach(() => limpar())

  it("preenche central e cliente A PARTIR DA OS", async () => {
    const { central, cliente, os } = await cenario()
    const { arquivo } = await anexarArquivoECU(String(os._id), {
      memoria: "flash",
      papel: "original",
      buffer: bin(),
      nome_original: "leitura.bin",
    })
    expect(String(arquivo.central_id)).toBe(String(central._id))
    expect(String(arquivo.cliente_id)).toBe(String(cliente._id))
  })

  it("IGNORA central e cliente que venham no input", async () => {
    // Regra de segurança do domínio: gravar o arquivo de um carro em outro pode
    // estragar o carro, então o vínculo nunca vem de fora.
    const { central, cliente, os } = await cenario()
    const outraCentral = await Central.create({ apelido: "peca de outro carro" })
    const outroCliente = await Cliente.create({
      nome: "Outro",
      telefone: "(11) 98888-7777",
      telefone_e164: "+5511988887777",
    })

    const { arquivo } = await anexarArquivoECU(String(os._id), {
      memoria: "flash",
      papel: "original",
      buffer: bin(),
      nome_original: "leitura.bin",
      central_id: String(outraCentral._id),
      cliente_id: String(outroCliente._id),
    } as never)

    expect(String(arquivo.central_id)).toBe(String(central._id))
    expect(String(arquivo.cliente_id)).toBe(String(cliente._id))
  })

  it("guarda os quatro arquivos de uma leitura completa", async () => {
    const { os } = await cenario()
    for (const memoria of ["flash", "eeprom"] as const) {
      for (const papel of ["original", "modificado"] as const) {
        await anexarArquivoECU(String(os._id), {
          memoria,
          papel,
          buffer: bin(`${memoria}-${papel}`),
          nome_original: `${memoria}.bin`,
        })
      }
    }
    const lista = await listarPorOS(String(os._id))
    expect(lista).toHaveLength(4)
    expect(lista.map((a) => `${a.memoria}/${a.papel}`)).toEqual([
      "flash/original",
      "flash/modificado",
      "eeprom/original",
      "eeprom/modificado",
    ])
  })

  it("avisa quando o MESMO binario e anexado de novo", async () => {
    const { os } = await cenario()
    const conteudo = bin("mesmo-conteudo")
    const a = await anexarArquivoECU(String(os._id), {
      memoria: "flash",
      papel: "original",
      buffer: conteudo,
      nome_original: "a.bin",
    })
    const b = await anexarArquivoECU(String(os._id), {
      memoria: "flash",
      papel: "modificado",
      buffer: conteudo,
      nome_original: "b.bin",
    })
    expect(a.duplicado).toBe(false)
    expect(b.duplicado).toBe(true)
    // Avisa, mas não impede: barrar travaria a bancada.
    expect(await ArquivoECU.countDocuments()).toBe(2)
  })

  it("recusa OS que nao existe", async () => {
    await expect(
      anexarArquivoECU("507f1f77bcf86cd799439011", {
        memoria: "flash",
        papel: "original",
        buffer: bin(),
        nome_original: "x.bin",
      })
    ).rejects.toThrow("OS não encontrada")
  })

  it("guarda em pasta por central e OS", async () => {
    const { central, os } = await cenario()
    await anexarArquivoECU(String(os._id), {
      memoria: "flash",
      papel: "original",
      buffer: bin(),
      nome_original: "x.bin",
    })
    expect(guardados[0].pasta).toBe(`techcode/ecu/${String(central._id)}/os-${os.numero_os}`)
  })
})

describe("as duas gavetas", () => {
  beforeEach(() => limpar())

  it("gaveta da central agrupa por OS, dizendo de qual carro veio", async () => {
    const a = await cenario({ cliente: "Oficina A" })
    await anexarArquivoECU(String(a.os._id), {
      memoria: "flash",
      papel: "original",
      buffer: bin("a"),
      nome_original: "a.bin",
    })

    const clienteB = await Cliente.create({
      nome: "Oficina B",
      telefone: "(11) 97777-6666",
      telefone_e164: "+5511977776666",
    })
    const osB = await OS.create({ cliente_id: clienteB._id, central_id: a.central._id })
    await anexarArquivoECU(String(osB._id), {
      memoria: "flash",
      papel: "original",
      buffer: bin("b"),
      nome_original: "b.bin",
    })

    const grupos = await listarPorCentral(String(a.central._id))
    expect(grupos).toHaveLength(2)
    // Cada grupo carrega o cliente: nenhum binário aparece solto.
    const nomes = grupos.map((g) => (g.cliente as { nome?: string } | null)?.nome)
    expect(nomes).toContain("Oficina A")
    expect(nomes).toContain("Oficina B")
  })

  it("gaveta do cliente traz so os arquivos dele", async () => {
    const a = await cenario({ cliente: "Oficina A" })
    await anexarArquivoECU(String(a.os._id), {
      memoria: "flash",
      papel: "original",
      buffer: bin("a"),
      nome_original: "a.bin",
    })
    const b = await cenario({ cliente: "Oficina B", modelo: "MT80" })
    await anexarArquivoECU(String(b.os._id), {
      memoria: "eeprom",
      papel: "modificado",
      buffer: bin("b"),
      nome_original: "b.bin",
    })

    const grupos = await listarPorCliente(String(a.cliente._id))
    expect(grupos).toHaveLength(1)
    expect(grupos[0].arquivos).toHaveLength(1)
    expect((grupos[0].central as { modelo?: string } | null)?.modelo).toBe("ME 7.4.9")
  })
})

describe("removerArquivoECU", () => {
  beforeEach(() => limpar())

  it("remove do banco e do armazenamento", async () => {
    const { os } = await cenario()
    const { arquivo } = await anexarArquivoECU(String(os._id), {
      memoria: "flash",
      papel: "original",
      buffer: bin(),
      nome_original: "x.bin",
    })
    const removido = await removerArquivoECU(String(os._id), String(arquivo._id))
    expect(removido).not.toBeNull()
    expect(await ArquivoECU.countDocuments()).toBe(0)
    expect(removidos).toHaveLength(1)
  })

  it("NAO remove arquivo de outra OS", async () => {
    const a = await cenario()
    const b = await cenario({ cliente: "Outro", modelo: "MT80" })
    const { arquivo } = await anexarArquivoECU(String(a.os._id), {
      memoria: "flash",
      papel: "original",
      buffer: bin(),
      nome_original: "x.bin",
    })
    // Id válido, mas de outra OS: não apaga nada.
    expect(await removerArquivoECU(String(b.os._id), String(arquivo._id))).toBeNull()
    expect(await ArquivoECU.countDocuments()).toBe(1)
    expect(removidos).toHaveLength(0)
  })

  it("id invalido devolve null sem lancar", async () => {
    const { os } = await cenario()
    expect(await removerArquivoECU(String(os._id), "nao-e-objectid")).toBeNull()
  })
})

describe("nome do download", () => {
  it("identifica OS, modelo e cliente no nome do arquivo", async () => {
    // O download existe para gravar de volta na central. O nome tem de dizer de
    // qual carro é, senão alguém grava o arquivo errado.
    const { os } = await cenario({ modelo: "ME 7.4.9", cliente: "Zé Elétrica" })
    const { arquivo } = await anexarArquivoECU(String(os._id), {
      memoria: "flash",
      papel: "original",
      buffer: bin(),
      nome_original: "LEITURA_FINAL.bin",
    })
    const nome = await nomeParaDownload(String(arquivo._id))
    expect(nome).toBe(`OS${os.numero_os}_ME-7-4-9_Ze-Eletrica_flash_original.bin`)
  })

  it("devolve null para arquivo que nao existe", async () => {
    expect(await nomeParaDownload("507f1f77bcf86cd799439011")).toBeNull()
  })
})

describe("proveniencia acompanha a correcao da OS", () => {
  beforeEach(() => limpar())

  it("trocar o CLIENTE da OS move os arquivos junto", async () => {
    // Sem isto, o binario do carro do Joao apareceria na gaveta do Pedro.
    const { os, central } = await cenario({ cliente: "Oficina A" })
    const { arquivo } = await anexarArquivoECU(String(os._id), {
      memoria: "flash",
      papel: "original",
      buffer: bin(),
      nome_original: "x.bin",
    })

    const outro = await Cliente.create({
      nome: "Oficina B",
      telefone: "(11) 96666-5555",
      telefone_e164: "+5511966665555",
    })
    const { atualizarOS } = await import("@/lib/services/os.service")
    await atualizarOS(String(os._id), { cliente_id: String(outro._id) })

    const depois = await ArquivoECU.findById(arquivo._id)
    expect(String(depois!.cliente_id)).toBe(String(outro._id))
    // a central nao foi tocada
    expect(String(depois!.central_id)).toBe(String(central._id))

    // e as gavetas acompanham
    expect(await listarPorCliente(String(outro._id))).toHaveLength(1)
    expect(await listarPorCliente(String((await Cliente.findOne({ nome: "Oficina A" }))!._id))).toHaveLength(0)
  })

  it("trocar a CENTRAL da OS move os arquivos junto", async () => {
    const { os, cliente } = await cenario()
    const { arquivo } = await anexarArquivoECU(String(os._id), {
      memoria: "eeprom",
      papel: "modificado",
      buffer: bin(),
      nome_original: "x.bin",
    })

    const outraCentral = await Central.create({
      marca: "Delphi",
      modelo: "MT80",
      codigo: "MT80X",
      status_catalogo: "confirmada",
    })
    const { atualizarOS } = await import("@/lib/services/os.service")
    await atualizarOS(String(os._id), { central_id: String(outraCentral._id) })

    const depois = await ArquivoECU.findById(arquivo._id)
    expect(String(depois!.central_id)).toBe(String(outraCentral._id))
    expect(String(depois!.cliente_id)).toBe(String(cliente._id))
  })

  it("update que nao toca cliente nem central deixa os arquivos em paz", async () => {
    const { os, central, cliente } = await cenario()
    const { arquivo } = await anexarArquivoECU(String(os._id), {
      memoria: "flash",
      papel: "original",
      buffer: bin(),
      nome_original: "x.bin",
    })
    const { atualizarOS } = await import("@/lib/services/os.service")
    await atualizarOS(String(os._id), { defeito_descricao: "outro defeito" })

    const depois = await ArquivoECU.findById(arquivo._id)
    expect(String(depois!.central_id)).toBe(String(central._id))
    expect(String(depois!.cliente_id)).toBe(String(cliente._id))
  })
})
