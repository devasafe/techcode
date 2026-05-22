import { connectDB } from "@/lib/db"
import Usuario from "@/models/Usuario"
import bcrypt from "bcryptjs"
import type { Perfil } from "@/types"

export type CreateUsuarioInput = {
  nome: string
  email: string
  senha: string
  perfis: Perfil[]
  comissao_pct?: number
}

export type UpdateUsuarioInput = {
  nome?: string
  email?: string
  senha?: string
  perfis?: Perfil[]
  comissao_pct?: number
  ativo?: boolean
}

export async function listarUsuarios() {
  await connectDB()
  return Usuario.find({}).select("-senha").lean()
}

export async function buscarUsuarioPorId(id: string) {
  await connectDB()
  return Usuario.findById(id).select("-senha").lean()
}

export async function criarUsuario(data: CreateUsuarioInput) {
  await connectDB()
  const existente = await Usuario.findOne({ email: data.email.toLowerCase() })
  if (existente) throw new Error("Email já cadastrado")
  const hash = await bcrypt.hash(data.senha, 10)
  return Usuario.create({ ...data, senha: hash })
}

export async function atualizarUsuario(id: string, data: UpdateUsuarioInput) {
  await connectDB()
  const payload: Record<string, unknown> = { ...data }
  if (data.senha) {
    payload.senha = await bcrypt.hash(data.senha, 10)
  }
  return Usuario.findByIdAndUpdate(id, payload, { returnDocument: "after" }).select("-senha").lean()
}

export async function desativarUsuario(id: string) {
  await connectDB()
  return Usuario.findByIdAndUpdate(id, { ativo: false }, { returnDocument: "after" }).select("-senha").lean()
}
