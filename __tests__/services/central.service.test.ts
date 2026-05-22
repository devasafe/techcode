import {
  criarCentral,
  listarCentrais,
  buscarCentralPorId,
  atualizarCentral,
  listarReparosDaCentral,
} from "@/lib/services/central.service"
import { criarCliente } from "@/lib/services/cliente.service"
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
