import {
  criarCliente,
  listarClientes,
  buscarClientePorId,
  atualizarCliente,
  listarOSDoCliente,
  obterOuCriarClientePorTelefone,
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

describe("obterOuCriarClientePorTelefone", () => {
  it("cria cliente so com telefone, usando o numero como nome", async () => {
    const cliente = await obterOuCriarClientePorTelefone("11999990000")
    expect(cliente.nome).toBe("(11) 99999-0000")
    expect(cliente.nome_confirmado).toBe(false)
    expect(cliente.telefone_e164).toBe("+5511999990000")
  })

  it("e idempotente para o mesmo numero em formatos diferentes", async () => {
    const a = await obterOuCriarClientePorTelefone("11999990000")
    const b = await obterOuCriarClientePorTelefone("(11) 99999-0000")
    const c = await obterOuCriarClientePorTelefone("+55 11 99999-0000")
    expect(String(b._id)).toBe(String(a._id))
    expect(String(c._id)).toBe(String(a._id))
    expect(await listarClientes()).toHaveLength(1)
  })

  it("preenche o nome depois, se ainda nao foi confirmado", async () => {
    await obterOuCriarClientePorTelefone("11999990000")
    const depois = await obterOuCriarClientePorTelefone("11999990000", { nome: "Ze Eletrica" })
    expect(depois.nome).toBe("Ze Eletrica")
    expect(depois.nome_confirmado).toBe(true)
  })

  it("NUNCA sobrescreve nome confirmado por humano", async () => {
    await obterOuCriarClientePorTelefone("11999990000", { nome: "Ze Eletrica" })
    const depois = await obterOuCriarClientePorTelefone("11999990000", { nome: "zezinho 123" })
    expect(depois.nome).toBe("Ze Eletrica")
  })

  it("rejeita telefone invalido", async () => {
    await expect(obterOuCriarClientePorTelefone("abc")).rejects.toThrow("Telefone inválido")
  })

  it("nao cria dois clientes em chamadas concorrentes", async () => {
    await Promise.all([
      obterOuCriarClientePorTelefone("11999990000"),
      obterOuCriarClientePorTelefone("11999990000"),
      obterOuCriarClientePorTelefone("11999990000"),
    ]).catch(() => {})
    expect(await listarClientes()).toHaveLength(1)
  })
})
