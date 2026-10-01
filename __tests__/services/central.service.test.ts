import {
  criarCentral,
  listarCentrais,
  buscarCentralPorId,
  atualizarCentral,
  listarReparosDaCentral,
  criarCentralRascunho,
  confirmarCentral,
  listarRascunhos,
  acrescentarTermosBusca,
  buscarAcervo,
  contarRascunhos,
  listarRascunhosComContexto,
} from "@/lib/services/central.service"
import { criarCliente } from "@/lib/services/cliente.service"
import Central from "@/models/Central"
import OS from "@/models/OS"

describe("central.service", () => {
  const dadosBase = {
    marca: "Bosch",
    modelo: "ME17.9.53",
    codigo: "4CFR",
  }

  it("cria central com campos obrigatórios", async () => {
    const central = await criarCentral(dadosBase)
    expect(central.marca).toBe("Bosch")
    expect(central.modelo).toBe("ME17.9.53")
    expect(central.codigo).toBe("4CFR")
  })

  it("lista todas as centrais ordenadas por marca e modelo", async () => {
    await criarCentral({ marca: "Siemens", modelo: "5WY", codigo: "ABC1" })
    await criarCentral(dadosBase)
    const lista = await listarCentrais()
    expect(lista.length).toBe(2)
    expect(lista[0].marca).toBe("Bosch")
  })

  it("filtra centrais por modelo", async () => {
    await criarCentral(dadosBase)
    await criarCentral({ marca: "Delphi", modelo: "MT80", codigo: "XYZ1" })
    const lista = await listarCentrais("MT80")
    expect(lista.length).toBe(1)
    expect(lista[0].marca).toBe("Delphi")
  })

  it("filtra centrais por marca", async () => {
    await criarCentral(dadosBase)
    await criarCentral({ marca: "Delphi", modelo: "MT80", codigo: "XYZ1" })
    const lista = await listarCentrais("Bosch")
    expect(lista.length).toBe(1)
    expect(lista[0].modelo).toBe("ME17.9.53")
  })

  it("filtra centrais por código", async () => {
    await criarCentral(dadosBase)
    await criarCentral({ marca: "Delphi", modelo: "MT80", codigo: "XYZ1" })
    const lista = await listarCentrais("XYZ")
    expect(lista.length).toBe(1)
    expect(lista[0].modelo).toBe("MT80")
  })

  it("busca central por id", async () => {
    const criada = await criarCentral(dadosBase)
    const encontrada = await buscarCentralPorId(criada._id.toString())
    expect(encontrada?.modelo).toBe("ME17.9.53")
  })

  it("retorna null para id inexistente", async () => {
    const encontrada = await buscarCentralPorId("000000000000000000000000")
    expect(encontrada).toBeNull()
  })

  it("atualiza dados da central", async () => {
    const criada = await criarCentral(dadosBase)
    const atualizada = await atualizarCentral(criada._id.toString(), { descricao: "Motor 1.0 Flex" })
    expect(atualizada?.descricao).toBe("Motor 1.0 Flex")
    expect(atualizada?.modelo).toBe("ME17.9.53")
  })

  it("listarReparosDaCentral retorna array vazio quando não há OS concluídas", async () => {
    const criada = await criarCentral(dadosBase)
    const reparos = await listarReparosDaCentral(criada._id.toString())
    expect(reparos).toEqual([])
  })

  it("listarReparosDaCentral retorna OS concluídas com nome do cliente populado", async () => {
    const central = await criarCentral(dadosBase)
    const cliente = await criarCliente({ nome: "João Teste", telefone: "11900000000" })
    await OS.create({
      cliente_id: cliente._id,
      central_id: central._id,
      status: "concluida",
      defeito_descricao: "Não liga",
      closed_at: new Date(),
    })
    const reparos = await listarReparosDaCentral(central._id.toString())
    expect(reparos.length).toBe(1)
    const clientePopulado = reparos[0].cliente_id as { nome: string } | null
    expect(clientePopulado).not.toBeNull()
    expect(clientePopulado?.nome).toBe("João Teste")
  })
})

describe("central.service — peça sem catálogo", () => {
  it("cria rascunho sem nenhum campo obrigatorio", async () => {
    const rascunho = await criarCentralRascunho({ apelido: "Peça #47" })
    expect(rascunho.status_catalogo).toBe("rascunho")
    expect(rascunho.origem).toBe("entrada_rapida")
    expect(rascunho.marca).toBeUndefined()
  })

  it("listarCentrais esconde rascunhos por padrao", async () => {
    await criarCentral({ marca: "Bosch", modelo: "4GV", codigo: "0261S04", status_catalogo: "confirmada" })
    await criarCentralRascunho({ apelido: "Peça #48" })
    const visiveis = await listarCentrais()
    expect(visiveis).toHaveLength(1)
    expect(visiveis[0].modelo).toBe("4GV")
  })

  it("listarCentrais mostra rascunhos quando pedido", async () => {
    await criarCentral({ marca: "Bosch", modelo: "4GV", codigo: "0261S04", status_catalogo: "confirmada" })
    await criarCentralRascunho({ apelido: "Peça #48" })
    expect(await listarCentrais(undefined, { incluirRascunhos: true })).toHaveLength(2)
  })

  it("central antiga sem status_catalogo continua aparecendo", async () => {
    // Documento como existia antes da Fase 0: sem o campo novo.
    await Central.collection.insertOne({ marca: "Delphi", modelo: "MT80", codigo: "MT80X" })
    const visiveis = await listarCentrais()
    expect(visiveis.map((c) => c.modelo)).toContain("MT80")
  })

  it("confirmarCentral promove o rascunho", async () => {
    const rascunho = await criarCentralRascunho({ apelido: "Peça #49" })
    const confirmada = await confirmarCentral(String(rascunho._id), {
      marca: "Magneti Marelli",
      modelo: "IAW 4GV",
      codigo: "iaw4gv-br",
    })
    expect(confirmada?.status_catalogo).toBe("confirmada")
    expect(confirmada?.codigo).toBe("IAW4GV-BR")
    expect(await listarCentrais()).toHaveLength(1)
  })

  it("listarRascunhos traz so os nao identificados", async () => {
    await criarCentralRascunho({ apelido: "a" })
    await criarCentralRascunho({ apelido: "b" })
    await criarCentral({ marca: "Bosch", modelo: "x", codigo: "y", status_catalogo: "confirmada" })
    expect(await listarRascunhos()).toHaveLength(2)
  })

  it("acrescentarTermosBusca acumula sem apagar", async () => {
    const c = await criarCentralRascunho({ apelido: "painel" })
    await acrescentarTermosBusca(String(c._id), "painel de Gol 2010")
    const depois = await acrescentarTermosBusca(String(c._id), "chicote diferente")
    expect(depois?.termos_busca).toBe("painel de Gol 2010 chicote diferente")
  })

  it("busca por apelido encontra a peca", async () => {
    await criarCentralRascunho({ apelido: "painel Gol 2010 chicote diferente" })
    const achados = await listarCentrais("chicote", { incluirRascunhos: true })
    expect(achados).toHaveLength(1)
  })
})

describe("buscarAcervo", () => {
  beforeEach(async () => {
    // $text exige o indice de texto criado; Central.init() espera por ele.
    await Central.init()
  })

  it("acha a peca pelo que foi FALADO no audio (termos_busca)", async () => {
    const c = await criarCentralRascunho({ apelido: "Peça #26" })
    await acrescentarTermosBusca(String(c._id), "749 Peugeot defeito de capacitor")

    const achados = await buscarAcervo("Peugeot", { incluirRascunhos: true })
    expect(achados).toHaveLength(1)
    expect(String(achados[0]._id)).toBe(String(c._id))
  })

  it("acha por termo parcial, que o $text sozinho nao pegaria", async () => {
    const c = await criarCentralRascunho({ apelido: "Peça #27" })
    await acrescentarTermosBusca(String(c._id), "defeito de capacitor estufado")
    // "capacit" nao e palavra inteira: so o fallback regex acha.
    const achados = await buscarAcervo("capacit", { incluirRascunhos: true })
    expect(achados).toHaveLength(1)
  })

  it("acha por termo curto tipo 4GV", async () => {
    await criarCentral({
      marca: "Magneti Marelli",
      modelo: "IAW 4GV",
      codigo: "4GVBR",
      status_catalogo: "confirmada",
    })
    expect(await buscarAcervo("4GV")).toHaveLength(1)
  })

  it("esconde rascunho por padrao e mostra quando pedido", async () => {
    const c = await criarCentralRascunho({ apelido: "Peça #28" })
    await acrescentarTermosBusca(String(c._id), "painel Gol 2010")

    expect(await buscarAcervo("painel")).toHaveLength(0)
    expect(await buscarAcervo("painel", { incluirRascunhos: true })).toHaveLength(1)
  })

  it("sem termo devolve o acervo mais recente primeiro", async () => {
    await criarCentral({ marca: "A", modelo: "antiga", codigo: "A1", status_catalogo: "confirmada" })
    await criarCentral({ marca: "B", modelo: "nova", codigo: "B1", status_catalogo: "confirmada" })
    const lista = await buscarAcervo()
    expect(lista).toHaveLength(2)
    expect(lista[0].modelo).toBe("nova")
  })

  it("termo sem resultado devolve vazio em vez de tudo", async () => {
    await criarCentral({ marca: "Bosch", modelo: "4GV", codigo: "X", status_catalogo: "confirmada" })
    expect(await buscarAcervo("helicoptero")).toHaveLength(0)
  })
})

describe("fila de identificacao", () => {
  it("contarRascunhos conta so os nao identificados", async () => {
    await criarCentralRascunho({ apelido: "a" })
    await criarCentralRascunho({ apelido: "b" })
    await criarCentral({ marca: "x", modelo: "y", codigo: "z", status_catalogo: "confirmada" })
    expect(await contarRascunhos()).toBe(2)
  })

  it("traz a foto e o audio transcrito junto, para dar contexto", async () => {
    const central = await criarCentralRascunho({ apelido: "Peça #30" })
    const cliente = await criarCliente({ nome: "Ze", telefone: "22999887766" })
    await OS.create({
      cliente_id: cliente._id,
      central_id: central._id,
      midias: [
        {
          tipo: "foto",
          url: "https://x/foto.jpg",
          public_id: "p1",
          resource_type: "image",
          origem: "camera",
        },
        {
          tipo: "audio",
          papel: "peca",
          url: "https://x/audio.webm",
          public_id: "p2",
          resource_type: "video",
          origem: "camera",
          transcricao: { status: "concluida", texto: "749 Peugeot", tentativas: 1 },
        },
      ],
    })

    const fila = await listarRascunhosComContexto()
    expect(fila).toHaveLength(1)
    expect(fila[0].fotos).toContain("https://x/foto.jpg")
    expect(fila[0].audios[0].texto).toBe("749 Peugeot")
    expect(fila[0].audios[0].papel).toBe("peca")
    expect(fila[0].os[0].cliente).toMatchObject({ nome: "Ze" })
  })

  it("rascunho sem OS nenhuma nao quebra a fila", async () => {
    await criarCentralRascunho({ apelido: "orfa" })
    const fila = await listarRascunhosComContexto()
    expect(fila[0].os).toEqual([])
    expect(fila[0].fotos).toEqual([])
  })
})
