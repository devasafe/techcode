import { connectDB } from "@/lib/db"
import Cliente from "@/models/Cliente"
import Central from "@/models/Central"
import { buscarEstatisticas, buscarRelatorioFinanceiro } from "@/lib/services/dashboard.service"
import { criarOS, atualizarOS, registrarDevolucao } from "@/lib/services/os.service"

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

describe("dashboard service", () => {
  it("buscarEstatisticas retorna contagens corretas por status", async () => {
    const os1 = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    const os2 = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "B" })
    await atualizarOS(os2._id.toString(), { status: "na_fila" })
    const stats = await buscarEstatisticas()
    expect(stats.por_status["aberta"]).toBe(1)
    expect(stats.por_status["na_fila"]).toBe(1)
  })

  it("buscarEstatisticas retorna totais financeiros das OS concluídas", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    await atualizarOS(os._id.toString(), {
      status: "concluida",
      valor_cobrado: 200,
      pecas: [{ nome: "Capacitor", custo: 50 }],
    })
    const stats = await buscarEstatisticas()
    expect(stats.totais.receita).toBe(200)
    expect(stats.totais.custo).toBe(50)
    expect(stats.totais.lucro).toBe(150)
  })

  it("buscarEstatisticas retorna lista de recentes com até 5 OS", async () => {
    for (let i = 0; i < 3; i++) {
      const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: `OS ${i}` })
      await atualizarOS(os._id.toString(), { status: "concluida", valor_cobrado: 100 })
    }
    const stats = await buscarEstatisticas()
    expect(stats.recentes.length).toBe(3)
  })

  it("buscarRelatorioFinanceiro filtra OS concluídas no mês atual", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    await atualizarOS(os._id.toString(), { status: "concluida", valor_cobrado: 300 })
    const rel = await buscarRelatorioFinanceiro("este_mes")
    expect(rel.totais.receita).toBeGreaterThanOrEqual(300)
    expect(rel.os.length).toBeGreaterThanOrEqual(1)
  })

  it("buscarRelatorioFinanceiro tudo retorna todas as concluídas", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    await atualizarOS(os._id.toString(), { status: "concluida", valor_cobrado: 150 })
    const rel = await buscarRelatorioFinanceiro("tudo")
    expect(rel.os.length).toBeGreaterThanOrEqual(1)
    expect(rel.totais.count).toBeGreaterThanOrEqual(1)
  })

  it("substituição conta com novo_valor_cobrado e custo_central nos totais", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    await atualizarOS(os._id.toString(), { status: "concluida", valor_cobrado: 750 })
    await registrarDevolucao(os._id.toString(), {
      tipo: "substituicao",
      motivo: "Reparo não resolveu o problema",
      custo_central: 1500,
      novo_valor_cobrado: 2000,
    })
    const stats = await buscarEstatisticas()
    // OS original (750) foi substituída — não conta mais como receita
    // Substituição conta: receita 2000, custo 1500, lucro 500
    expect(stats.totais.receita).toBeGreaterThanOrEqual(2000)
    expect(stats.totais.lucro).toBeGreaterThanOrEqual(500)

    const rel = await buscarRelatorioFinanceiro("tudo")
    const osSubstituida = rel.os.find((o) => o._id.toString() === os._id.toString())
    expect(osSubstituida).toBeDefined()
    expect(osSubstituida!.status).toBe("substituida")
  })
})
