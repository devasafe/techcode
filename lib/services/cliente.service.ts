import { connectDB } from "@/lib/db"
import Cliente from "@/models/Cliente"
import OS from "@/models/OS"

export type CreateClienteInput = {
  nome: string
  telefone: string
  email?: string
  cpf_cnpj?: string
  endereco?: string
}

export type UpdateClienteInput = Partial<CreateClienteInput>

export async function listarClientes(q?: string) {
  await connectDB()
  const filtro = q
    ? { $or: [{ nome: new RegExp(q, "i") }, { telefone: new RegExp(q, "i") }] }
    : {}
  return Cliente.find(filtro).sort({ nome: 1 }).lean()
}

export async function buscarClientePorId(id: string) {
  await connectDB()
  return Cliente.findById(id).lean()
}

export async function criarCliente(data: CreateClienteInput) {
  await connectDB()
  return Cliente.create(data)
}

export async function atualizarCliente(id: string, data: UpdateClienteInput) {
  await connectDB()
  return Cliente.findByIdAndUpdate(id, data, { returnDocument: "after" }).lean()
}

export async function listarOSDoCliente(clienteId: string) {
  await connectDB()
  return OS.find({ cliente_id: clienteId })
    .populate("central_id", "marca modelo codigo")
    .sort({ created_at: -1 })
    .lean()
}
