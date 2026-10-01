jest.mock("@/lib/cloudinary", () => require("../mocks/cloudinary"))

import { registrarEntrada } from "@/lib/services/entrada.service"
import { listarCentrais, listarRascunhos } from "@/lib/services/central.service"
import { listarClientes } from "@/lib/services/cliente.service"
import Cliente from "@/models/Cliente"
import Central from "@/models/Central"
import OS from "@/models/OS"
import { uploadsFeitos, limparUploads, controle } from "../mocks/cloudinary"

describe("registrarEntrada", () => {
  beforeEach(() => limparUploads())

  it("registra entrada so com o telefone: sem peca, sem defeito, sem midia", async () => {
    const { os } = await registrarEntrada({ telefone: "22999887766" })
    expect(os.numero_os).toBeGreaterThan(0)
    expect(os.status).toBe("aberta")
    expect(os.defeito_descricao).toBeUndefined()

    const clientes = await listarClientes()
    expect(clientes).toHaveLength(1)
    expect(clientes[0].nome).toBe("(22) 99988-7766")
  })

  it("cria a peca como rascunho com o numero da OS no apelido", async () => {
    const { os } = await registrarEntrada({ telefone: "22999887766" })
    const central = await Central.findById(os.central_id)
    expect(central?.status_catalogo).toBe("rascunho")
    expect(central?.apelido).toBe(`Peça #${os.numero_os}`)
    expect(central?.origem).toBe("entrada_rapida")
  })

  it("respeita apelido informado em vez de usar o numero", async () => {
    const { os } = await registrarEntrada({
      telefone: "22999887766",
      apelido_peca: "painel Gol 2010 chicote diferente",
    })
    const central = await Central.findById(os.central_id)
    expect(central?.apelido).toBe("painel Gol 2010 chicote diferente")
  })

  it("rascunho nao aparece no autocomplete de peca", async () => {
    await registrarEntrada({ telefone: "22999887766" })
    expect(await listarCentrais()).toHaveLength(0)
    expect(await listarRascunhos()).toHaveLength(1)
  })

  it("reaproveita peca do catalogo quando informada", async () => {
    const existente = await Central.create({
      marca: "Bosch",
      modelo: "4GV",
      codigo: "0261S04",
      status_catalogo: "confirmada",
    })
    const { os } = await registrarEntrada({
      telefone: "22999887766",
      central_id: String(existente._id),
    })
    expect(String(os.central_id)).toBe(String(existente._id))
    expect(await listarRascunhos()).toHaveLength(0)
  })

  it("reaproveita cliente existente em vez de duplicar", async () => {
    const cliente = await Cliente.create({
      nome: "Ze Eletrica",
      telefone: "(22) 99988-7766",
      telefone_e164: "+5522999887766",
      nome_confirmado: true,
    })
    const { os } = await registrarEntrada({ telefone: "22 99988-7766" })
    expect(String(os.cliente_id)).toBe(String(cliente._id))
    expect(await listarClientes()).toHaveLength(1)
  })

  it("chave_idempotencia repetida devolve a MESMA OS", async () => {
    const chave = "toque-duplo-abc"
    const a = await registrarEntrada({ telefone: "22999887766", chave_idempotencia: chave })
    const b = await registrarEntrada({ telefone: "22999887766", chave_idempotencia: chave })
    expect(String(b.os._id)).toBe(String(a.os._id))
    expect(b.reaproveitada).toBe(true)
    expect(await OS.countDocuments()).toBe(1)
    // E nao deixou peca orfa para tras.
    expect(await Central.countDocuments()).toBe(1)
  })

  it("nao duplica OS em dois toques simultaneos", async () => {
    const chave = "corrida-xyz"
    await Promise.all([
      registrarEntrada({ telefone: "22999887766", chave_idempotencia: chave }),
      registrarEntrada({ telefone: "22999887766", chave_idempotencia: chave }),
    ])
    expect(await OS.countDocuments()).toBe(1)
  })

  it("anexa foto e audio, e so o audio entra na fila de transcricao", async () => {
    const { os } = await registrarEntrada({
      telefone: "22999887766",
      arquivos: [
        { tipo: "foto", buffer: Buffer.from("fake-jpeg"), mime: "image/jpeg" },
        { tipo: "audio", buffer: Buffer.from("fake-opus"), mime: "audio/webm" },
      ],
    })

    expect(os.midias).toHaveLength(2)
    const foto = os.midias.find((m) => m.tipo === "foto")!
    const audio = os.midias.find((m) => m.tipo === "audio")!

    expect(foto.resource_type).toBe("image")
    expect(foto.transcricao).toBeUndefined()

    // Audio sobe como "video" no Cloudinary: e o pipeline que devolve duracao.
    expect(audio.resource_type).toBe("video")
    expect(audio.duracao_s).toBe(12.5)
    expect(audio.transcricao?.status).toBe("pendente")

    // public_id guardado, para o delete nao precisar deduzir por regex.
    expect(foto.public_id).toContain("techcode/os/")
    expect(uploadsFeitos.map((u) => u.resource_type)).toEqual(["image", "video"])
  })

  it("entrada sobrevive a falha de upload E DEVOLVE a falha", async () => {
    controle.falhar = true
    const { os, falhas } = await registrarEntrada({
      telefone: "22999887766",
      arquivos: [
        { tipo: "foto", buffer: Buffer.from("x") },
        { tipo: "audio", buffer: Buffer.from("y") },
      ],
    })
    // A OS existe mesmo sem a midia: travar a bancada seria pior que perder a foto.
    expect(os.numero_os).toBeGreaterThan(0)
    expect(os.midias).toHaveLength(0)
    // Mas a falha NAO pode ser engolida: quem esta na bancada tem de saber.
    expect(falhas).toHaveLength(2)
    expect(falhas.map((f) => f.tipo).sort()).toEqual(["audio", "foto"])
  })

  it("traduz 403 do Cloudinary para algo que se entende", async () => {
    controle.falharCom = { http_code: 403, message: "Server returned unexpected status code - 403" }
    const { falhas } = await registrarEntrada({
      telefone: "22999887766",
      arquivos: [{ tipo: "foto", buffer: Buffer.from("x") }],
    })
    expect(falhas[0].motivo).toContain("chave sem permissão de upload")
  })

  it("sem falha de upload, falhas vem vazio", async () => {
    const { falhas } = await registrarEntrada({
      telefone: "22999887766",
      arquivos: [{ tipo: "foto", buffer: Buffer.from("x") }],
    })
    expect(falhas).toEqual([])
  })

  it("exige cliente ou telefone", async () => {
    await expect(registrarEntrada({})).rejects.toThrow("Informe o cliente ou o telefone")
  })

  it("guarda o defeito digitado quando ha um", async () => {
    const { os } = await registrarEntrada({
      telefone: "22999887766",
      defeito: "  nao liga o painel  ",
    })
    expect(os.defeito_descricao).toBe("nao liga o painel")
  })
})
