import { connectDB } from "@/lib/db"
import Cliente from "@/models/Cliente"
import Central from "@/models/Central"
import Usuario from "@/models/Usuario"
import {
  gerarComissao,
  listarComissoes,
  marcarComoPago,
} from "@/lib/services/comissao.service"
import { criarOS, atualizarOS } from "@/lib/services/os.service"

let clienteId: string
let centralId: string
let tecnicoId: string

beforeAll(async () => {
  await connectDB()
})

beforeEach(async () => {
  const cli = await Cliente.create({ nome: "João", telefone: "11999990000" })
  clienteId = cli._id.toString()
  const cen = await Central.create({ marca: "Bosch", modelo: "ME17", codigo: "X1" })
  centralId = cen._id.toString()
  const tec = await Usuario.create({
    nome: "Técnico A",
    email: `tec${Date.now()}@teste.com`,
    senha: "hash",
    perfis: ["tecnico"],
    comissao_pct: 20,
  })
  tecnicoId = tec._id.toString()
})

describe("comissao service", () => {
  it("gerarComissao cria registro com valores corretos", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    await atualizarOS(os._id.toString(), { status: "concluida", valor_cobrado: 500 })
    const comissao = await gerarComissao(os._id.toString(), tecnicoId)
    expect(comissao?.valor_os).toBe(500)
    expect(comissao?.pct_comissao).toBe(20)
    expect(comissao?.valor_comissao).toBe(100)
    expect(comissao?.pago).toBe(false)
  })

  it("gerarComissao retorna null para técnico com comissao_pct 0", async () => {
    const tec0 = await Usuario.create({
      nome: "Sem comissão",
      email: `sem${Date.now()}@teste.com`,
      senha: "hash",
      perfis: ["tecnico"],
      comissao_pct: 0,
    })
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    await atualizarOS(os._id.toString(), { status: "concluida", valor_cobrado: 500 })
    const result = await gerarComissao(os._id.toString(), tec0._id.toString())
    expect(result).toBeNull()
  })

  it("gerarComissao retorna null para OS id inexistente", async () => {
    const result = await gerarComissao("000000000000000000000000", tecnicoId)
    expect(result).toBeNull()
  })

  it("listarComissoes retorna lista com populate de os_id e tecnico_id", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    await atualizarOS(os._id.toString(), { status: "concluida", valor_cobrado: 300 })
    await gerarComissao(os._id.toString(), tecnicoId)
    const lista = await listarComissoes()
    expect(lista.length).toBeGreaterThanOrEqual(1)
    expect((lista[0].tecnico_id as { nome: string }).nome).toBe("Técnico A")
    expect((lista[0].os_id as { numero_os: number }).numero_os).toBeDefined()
  })

  it("listarComissoes filtra por tecnico_id", async () => {
    const outroTec = await Usuario.create({
      nome: "Outro Técnico",
      email: `outro${Date.now()}@teste.com`,
      senha: "hash",
      perfis: ["tecnico"],
      comissao_pct: 10,
    })
    const os1 = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    await atualizarOS(os1._id.toString(), { status: "concluida", valor_cobrado: 100 })
    await gerarComissao(os1._id.toString(), tecnicoId)
    const os2 = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "B" })
    await atualizarOS(os2._id.toString(), { status: "concluida", valor_cobrado: 100 })
    await gerarComissao(os2._id.toString(), outroTec._id.toString())
    const lista = await listarComissoes({ tecnico_id: tecnicoId })
    expect(lista.length).toBe(1)
    expect((lista[0].tecnico_id as { nome: string }).nome).toBe("Técnico A")
  })

  it("marcarComoPago atualiza pago e data_pagamento", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    await atualizarOS(os._id.toString(), { status: "concluida", valor_cobrado: 200 })
    const comissao = await gerarComissao(os._id.toString(), tecnicoId)
    const paga = await marcarComoPago(comissao!._id.toString())
    expect(paga?.pago).toBe(true)
    expect(paga?.data_pagamento).toBeDefined()
  })

  it("marcarComoPago retorna null para id inexistente", async () => {
    const result = await marcarComoPago("000000000000000000000000")
    expect(result).toBeNull()
  })
})
