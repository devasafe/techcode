import {
  criarCliente,
  listarClientes,
  buscarClientePorId,
  atualizarCliente,
  listarOSDoCliente,
} from "@/lib/services/cliente.service"

describe("cliente.service", () => {
  const dadosBase = {
    nome: "Maria Silva",
    telefone: "11999990000",
  }

  it("cria cliente com campos obrigatórios", async () => {
    const cliente = await criarCliente(dadosBase)
    expect(cliente.nome).toBe("Maria Silva")
    expect(cliente.telefone).toBe("11999990000")
  })

  it("lista todos os clientes ordenados por nome", async () => {
    await criarCliente({ nome: "Zé Costa", telefone: "11888880000" })
    await criarCliente(dadosBase)
    const lista = await listarClientes()
    expect(lista.length).toBe(2)
    expect(lista[0].nome).toBe("Maria Silva")
  })

  it("filtra clientes por nome", async () => {
    await criarCliente(dadosBase)
    await criarCliente({ nome: "João Costa", telefone: "11888880000" })
    const lista = await listarClientes("Maria")
    expect(lista.length).toBe(1)
    expect(lista[0].nome).toBe("Maria Silva")
  })

  it("filtra clientes por telefone", async () => {
    await criarCliente(dadosBase)
    await criarCliente({ nome: "João Costa", telefone: "11888880000" })
    const lista = await listarClientes("8888")
    expect(lista.length).toBe(1)
    expect(lista[0].nome).toBe("João Costa")
  })

  it("busca cliente por id", async () => {
    const criado = await criarCliente(dadosBase)
    const encontrado = await buscarClientePorId(criado._id.toString())
    expect(encontrado?.nome).toBe("Maria Silva")
  })

  it("retorna null para id inexistente", async () => {
    const encontrado = await buscarClientePorId("000000000000000000000000")
    expect(encontrado).toBeNull()
  })

  it("atualiza dados do cliente", async () => {
    const criado = await criarCliente(dadosBase)
    const atualizado = await atualizarCliente(criado._id.toString(), { nome: "Maria Santos" })
    expect(atualizado?.nome).toBe("Maria Santos")
    expect(atualizado?.telefone).toBe("11999990000")
  })

  it("listarOSDoCliente retorna array vazio quando não há OS", async () => {
    const criado = await criarCliente(dadosBase)
    const os = await listarOSDoCliente(criado._id.toString())
    expect(os).toEqual([])
  })
})
