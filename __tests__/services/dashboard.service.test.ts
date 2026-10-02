import OS from "@/models/OS"
import { connectDB } from "@/lib/db"
import Cliente from "@/models/Cliente"
import Central from "@/models/Central"
import { buscarEstatisticas, buscarRelatorioFinanceiro,
  medirAdocao,
} from "@/lib/services/dashboard.service"
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

describe("medirAdocao", () => {
  it("conta entradas por dia e a media", async () => {
    const central = await Central.create({ apelido: "p", origem: "entrada_rapida" })
    const cliente = await Cliente.create({ nome: "Ze", telefone: "22999887766" })
    await OS.create({ cliente_id: cliente._id, central_id: central._id })
    await OS.create({ cliente_id: cliente._id, central_id: central._id })

    const a = await medirAdocao(14)
    expect(a.total).toBe(2)
    expect(a.por_dia.reduce((s, d) => s + d.n, 0)).toBe(2)
    expect(a.via_entrada_rapida).toBe(1)
  })

  it("mede o uso da captura: foto, audio e audio da peca", async () => {
    const central = await Central.create({ apelido: "p" })
    const cliente = await Cliente.create({ nome: "Ze", telefone: "22999887766" })
    await OS.create({
      cliente_id: cliente._id,
      central_id: central._id,
      midias: [
        { tipo: "foto", url: "u", public_id: "p", resource_type: "image", origem: "camera" },
        {
          tipo: "audio",
          papel: "peca",
          url: "u2",
          public_id: "p2",
          resource_type: "video",
          origem: "camera",
        },
      ],
    })
    // Esta sem midia nenhuma: entra no total, nao nos contadores de captura.
    await OS.create({ cliente_id: cliente._id, central_id: central._id })

    const a = await medirAdocao(14)
    expect(a.total).toBe(2)
    expect(a.com_foto).toBe(1)
    expect(a.com_audio).toBe(1)
    expect(a.com_audio_peca).toBe(1)
  })

  it("ignora OS fora da janela de dias", async () => {
    const central = await Central.create({ apelido: "p" })
    const cliente = await Cliente.create({ nome: "Ze", telefone: "22999887766" })
    const antiga = new Date()
    antiga.setDate(antiga.getDate() - 40)
    await OS.create({ cliente_id: cliente._id, central_id: central._id, created_at: antiga })
    expect((await medirAdocao(14)).total).toBe(0)
  })

  it("sem movimento devolve zero em vez de quebrar", async () => {
    const a = await medirAdocao(14)
    expect(a.total).toBe(0)
    expect(a.media_por_dia).toBe(0)
    expect(a.por_usuario).toEqual([])
  })
})

describe("reembolso desconta do lucro", () => {
  it("OS devolvida com reembolso total vira prejuizo do custo da peca", async () => {
    // Cobrou 300, gastou 50 de peca, devolveu os 300: perdeu os 50.
    // Antes desta regra o sistema dizia lucro 250 -- erro de 300 numa OS so.
    const cliente = await Cliente.create({ nome: "Ze", telefone: "22999887766" })
    const central = await Central.create({ apelido: "peca" })
    const os = await OS.create({
      cliente_id: cliente._id,
      central_id: central._id,
      status: "devolvida",
      valor_cobrado: 300,
      custo_total_pecas: 50,
      lucro_liquido: 250, // valor obsoleto da conclusao, de proposito
      closed_at: new Date(),
      devolucao: {
        tipo: "reembolso",
        motivo: "voltou com problema",
        valor_reembolsado: 300,
        data: new Date(),
      },
    })
    expect(os.status).toBe("devolvida")

    const r = await buscarRelatorioFinanceiro("tudo")
    expect(r.totais.receita).toBe(0) // 300 cobrado - 300 devolvido
    expect(r.totais.custo).toBe(50)
    expect(r.totais.lucro).toBe(-50)
  })

  it("reembolso parcial desconta so o que foi devolvido", async () => {
    const cliente = await Cliente.create({ nome: "Ze", telefone: "22999887766" })
    const central = await Central.create({ apelido: "peca" })
    await OS.create({
      cliente_id: cliente._id,
      central_id: central._id,
      status: "devolvida",
      valor_cobrado: 300,
      custo_total_pecas: 50,
      lucro_liquido: 250,
      closed_at: new Date(),
      devolucao: { tipo: "reembolso", motivo: "x", valor_reembolsado: 100, data: new Date() },
    })
    const r = await buscarRelatorioFinanceiro("tudo")
    expect(r.totais.receita).toBe(200)
    expect(r.totais.lucro).toBe(150)
  })

  it("substituicao continua usando os valores da devolucao", async () => {
    // Regressao: a regra que ja existia nao pode ter mudado.
    const cliente = await Cliente.create({ nome: "Ze", telefone: "22999887766" })
    const central = await Central.create({ apelido: "peca" })
    await OS.create({
      cliente_id: cliente._id,
      central_id: central._id,
      status: "substituida",
      valor_cobrado: 300,
      custo_total_pecas: 50,
      lucro_liquido: 250,
      closed_at: new Date(),
      devolucao: {
        tipo: "substituicao",
        motivo: "x",
        central_adquirida: "ME17 recondicionada",
        custo_central: 120,
        novo_valor_cobrado: 400,
        data: new Date(),
      },
    })
    const r = await buscarRelatorioFinanceiro("tudo")
    expect(r.totais.receita).toBe(400)
    expect(r.totais.custo).toBe(120)
    expect(r.totais.lucro).toBe(280)
  })
})
