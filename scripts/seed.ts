import mongoose from "mongoose"
import bcrypt from "bcryptjs"

const MONGODB_URI = process.env.MONGODB_URI!

async function seed() {
  await mongoose.connect(MONGODB_URI)

  const { default: Usuario } = await import("../models/Usuario")

  const existente = await Usuario.findOne({ email: "admin@techcode.com" })
  if (existente) {
    console.log("Admin já existe.")
    await mongoose.disconnect()
    return
  }

  const hash = await bcrypt.hash("admin123", 10)
  await Usuario.create({
    nome: "Administrador",
    email: "admin@techcode.com",
    senha: hash,
    perfis: ["admin"],
    comissao_pct: 0,
    ativo: true,
  })

  console.log("Admin criado: admin@techcode.com / admin123")
  console.log("IMPORTANTE: troque a senha após o primeiro login.")
  await mongoose.disconnect()
}

seed().catch(console.error)
