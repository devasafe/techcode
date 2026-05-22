import {
  criarUsuario,
  listarUsuarios,
  buscarUsuarioPorId,
  atualizarUsuario,
  desativarUsuario,
} from "@/lib/services/usuario.service"
import Usuario from "@/models/Usuario"

describe("usuario.service", () => {
  const dadosBase = {
    nome: "João Admin",
    email: "joao@techcode.com",
    senha: "senha123",
    perfis: ["admin"] as const,
  }

  it("cria usuário com senha hashada", async () => {
    const user = await criarUsuario(dadosBase)
    expect(user.nome).toBe("João Admin")
    expect(user.senha).not.toBe("senha123")
    expect(user.ativo).toBe(true)
  })

  it("rejeita email duplicado", async () => {
    await criarUsuario(dadosBase)
    await expect(criarUsuario(dadosBase)).rejects.toThrow("Email já cadastrado")
  })

  it("lista usuários sem retornar senha", async () => {
    await criarUsuario(dadosBase)
    const lista = await listarUsuarios()
    expect(lista.length).toBe(1)
    expect((lista[0] as any).senha).toBeUndefined()
  })

  it("busca usuário por id sem senha", async () => {
    const criado = await criarUsuario(dadosBase)
    const encontrado = await buscarUsuarioPorId(criado._id.toString())
    expect(encontrado?.nome).toBe("João Admin")
    expect((encontrado as any)?.senha).toBeUndefined()
  })

  it("atualiza nome do usuário", async () => {
    const user = await criarUsuario(dadosBase)
    const atualizado = await atualizarUsuario(user._id.toString(), { nome: "João Silva" })
    expect(atualizado?.nome).toBe("João Silva")
  })

  it("desativa usuário", async () => {
    const user = await criarUsuario(dadosBase)
    await desativarUsuario(user._id.toString())
    const db = await Usuario.findById(user._id)
    expect(db?.ativo).toBe(false)
  })
})
