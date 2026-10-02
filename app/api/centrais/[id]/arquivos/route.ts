import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { connectDB } from "@/lib/db"
import { uploadArquivo, deletarArquivo } from "@/lib/cloudinary"
import Central from "@/models/Central"

/** Material de modelo (datasheet, esquema) e binário de ECU cabem folgados aqui. */
const LIMITE_BYTES = 25 * 1024 * 1024

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

  // Sem teto, o arquivo inteiro ia para a memória do container sem limite.
  const declarado = Number(req.headers.get("content-length") ?? 0)
  if (declarado > LIMITE_BYTES) {
    return NextResponse.json({ error: "Arquivo acima de 25 MB" }, { status: 413 })
  }

  const formData = await req.formData()
  const arquivo = formData.get("arquivo") as File | null
  if (!arquivo) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
  if (arquivo.size > LIMITE_BYTES) {
    return NextResponse.json({ error: "Arquivo acima de 25 MB" }, { status: 413 })
  }

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
  if (!session?.user?.perfis?.length) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  const { id } = await params

  try {
    const { arquivo_id } = (await req.json()) as { arquivo_id?: string }
    if (!arquivo_id) {
      return NextResponse.json({ error: "arquivo_id obrigatório" }, { status: 400 })
    }

    await connectDB()

    // O `public_id` e o `tipo` são RELIDOS do subdocumento desta central, e o
    // que vier no corpo da requisição é ignorado. Antes a rota apagava o
    // public_id recebido direto no Cloudinary: dava para apagar arquivo de
    // outra central — ou qualquer asset cujo public_id alguém descobrisse.
    const central = await Central.findOne(
      { _id: id, "arquivos._id": arquivo_id },
      { "arquivos.$": 1 }
    ).lean()

    const arquivo = central?.arquivos?.[0]
    if (!arquivo) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 })
    }

    const resource_type = arquivo.tipo === "imagem" ? "image" : "raw"
    try {
      await deletarArquivo(arquivo.public_id, resource_type)
    } catch {
      // Falha no Cloudinary não impede remover a referência do banco.
    }

    const atualizada = await Central.findByIdAndUpdate(
      id,
      { $pull: { arquivos: { _id: arquivo_id } } },
      { returnDocument: "after" }
    ).lean()

    if (!atualizada) {
      return NextResponse.json({ error: "Central não encontrada" }, { status: 404 })
    }
    return NextResponse.json({ arquivos: atualizada.arquivos })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao remover arquivo"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
