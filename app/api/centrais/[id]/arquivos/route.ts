import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { connectDB } from "@/lib/db"
import { uploadArquivo, deletarArquivo } from "@/lib/cloudinary"
import Central from "@/models/Central"

type Params = { params: Promise<{ id: string }> }

function detectarTipo(nome: string, mimetype: string): "imagem" | "pdf" | "outro" {
  if (mimetype.startsWith("image/")) return "imagem"
  if (mimetype === "application/pdf" || nome.toLowerCase().endsWith(".pdf")) return "pdf"
  return "outro"
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params

  const formData = await req.formData()
  const arquivo = formData.get("arquivo") as File | null
  if (!arquivo) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })

  const buffer = Buffer.from(await arquivo.arrayBuffer())
  const tipo = detectarTipo(arquivo.name, arquivo.type)
  const resource_type = tipo === "imagem" ? "image" : "raw"

  const { url, public_id } = await uploadArquivo(buffer, {
    pasta: `techcode/centrais/${id}`,
    resource_type,
  })

  await connectDB()
  const central = await Central.findByIdAndUpdate(
    id,
    {
      $push: {
        arquivos: {
          nome: arquivo.name,
          url,
          public_id,
          tipo,
          tamanho: arquivo.size,
          created_at: new Date(),
        },
      },
    },
    { returnDocument: "after" }
  ).lean()

  if (!central) return NextResponse.json({ error: "Central não encontrada" }, { status: 404 })
  return NextResponse.json({ arquivos: central.arquivos })
}

export async function DELETE(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params

  const { arquivo_id, public_id, tipo } = await req.json() as {
    arquivo_id: string
    public_id: string
    tipo: "imagem" | "pdf" | "outro"
  }

  const resource_type = tipo === "imagem" ? "image" : "raw"
  try { await deletarArquivo(public_id, resource_type) } catch { /* ignora */ }

  await connectDB()
  const central = await Central.findByIdAndUpdate(
    id,
    { $pull: { arquivos: { _id: arquivo_id } } },
    { returnDocument: "after" }
  ).lean()

  if (!central) return NextResponse.json({ error: "Central não encontrada" }, { status: 404 })
  return NextResponse.json({ arquivos: central.arquivos })
}
