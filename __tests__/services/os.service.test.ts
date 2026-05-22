import { connectDB } from "@/lib/db"
import Cliente from "@/models/Cliente"
import Central from "@/models/Central"
import OS from "@/models/OS"
import {
  criarOS,
  listarOS,
  buscarOSPorId,
  atualizarOS,
  listarOSFila,
} from "@/lib/services/os.service"

let clienteId: string
let centralId: string

beforeAll(async () => {
  await connectDB()
})

beforeEach(async () => {
  const cli = await Cliente.create({ nome: "João Teste", telefone: "11999990000" })
  clienteId = cli._id.toString()
  const cen = await Central.create({ marca: "Bosch", modelo: "ME17.9.53", codigo: "4CFR" })
  centralId = cen._id.toString()
})

describe("OS service", () => {
  it("cria OS com numero_os auto-incrementado", async () => {
    const os1 = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Não liga" })
    expect(os1.numero_os).toBe(1)
    expect(os1.status).toBe("aberta")
    const os2 = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Falha sensor" })
    expect(os2.numero_os).toBe(2)
  })

  it("listarOS retorna todas ordenadas por created_at desc", async () => {
    await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Defeito A" })
    await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Defeito B" })
    const lista = await listarOS()
    expect(lista.length).toBe(2)
    expect(lista[0].defeito_descricao).toBe("Defeito B")
  })

  it("listarOS filtra por status", async () => {
    const os1 = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    const os2 = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "B" })
    await atualizarOS(os2._id.toString(), { status: "na_fila" })
    const abertas = await listarOS({ status: "aberta" })
    expect(abertas.length).toBe(1)
    expect(String(abertas[0]._id)).toBe(os1._id.toString())
  })

  it("buscarOSPorId retorna OS com populate", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Teste" })
    const found = await buscarOSPorId(os._id.toString())
    expect(found?.defeito_descricao).toBe("Teste")
    expect((found?.cliente_id as { nome: string })?.nome).toBe("João Teste")
    expect((found?.central_id as { marca: string })?.marca).toBe("Bosch")
  })

  it("buscarOSPorId retorna null para id inexistente", async () => {
    const found = await buscarOSPorId("000000000000000000000000")
    expect(found).toBeNull()
  })

  it("atualizarOS muda status", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Teste" })
    const atualizado = await atualizarOS(os._id.toString(), { status: "na_fila" })
    expect(atualizado?.status).toBe("na_fila")
  })

  it("atualizarOS para concluida seta closed_at, custo_total_pecas, lucro_liquido e garantia_ate", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Teste" })
    const atualizado = await atualizarOS(os._id.toString(), {
      status: "concluida",
      solucao_descricao: "Reprogramado",
      pecas: [{ nome: "Capacitor", custo: 5 }],
      valor_cobrado: 150,
      garantia_dias: 90,
    })
    expect(atualizado?.status).toBe("concluida")
    expect(atualizado?.closed_at).toBeDefined()
    expect(atualizado?.custo_total_pecas).toBe(5)
    expect(atualizado?.lucro_liquido).toBe(145)
    expect(atualizado?.garantia_ate).toBeDefined()
  })

  it("atualizarOS retorna null para id inexistente", async () => {
    const result = await atualizarOS("000000000000000000000000", { status: "na_fila" })
    expect(result).toBeNull()
  })

  it("listarOS filtra por cliente_id", async () => {
    const outroCli = await Cliente.create({ nome: "Maria", telefone: "11888880000" })
    await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "OS do João" })
    await criarOS({ cliente_id: outroCli._id.toString(), central_id: centralId, defeito_descricao: "OS da Maria" })
    const lista = await listarOS({ cliente_id: clienteId })
    expect(lista.length).toBe(1)
    expect(lista[0].defeito_descricao).toBe("OS do João")
  })

  it("listarOSFila retorna apenas OS com status ativo", async () => {
    const osAtiva = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Ativa" })
    const osConc = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Concluída" })
    await atualizarOS(osConc._id.toString(), { status: "concluida", valor_cobrado: 100 })
    const fila = await listarOSFila()
    expect(fila.length).toBe(1)
    expect(String(fila[0]._id)).toBe(osAtiva._id.toString())
  })
})
