import { NextResponse } from "next/server"
import { auth } from "@/auth"
import OS from "@/models/OS"
import { connectDB } from "@/lib/db"
import { anexarArquivos, type ArquivoEntrada } from "@/lib/services/entrada.service"
import { LIMITE_FOTO_BYTES, LIMITE_AUDIO_BYTES } from "@/lib/schemas/entrada"
import { deletarArquivo } from "@/lib/cloudinary"

/**
 * Anexa (ou reenvia) mídia numa OS que já existe. Serve para o "tentar de novo"
 * da tela de entrada: quando o upload falha, a OS já está registrada e a foto
 * não pode ficar perdida.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.perfis?.length) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params

  try {
    await connectDB()
    const os = await OS.findById(id)
    if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 })

    const form = await req.formData()
    const arquivos: ArquivoEntrada[] = []

    for (const f of form.getAll("foto")) {
      if (!(f instanceof File) || f.size === 0) continue
      if (f.size > LIMITE_FOTO_BYTES) {
        return NextResponse.json({ error: "Foto acima de 8 MB" }, { status: 400 })
      }
      arquivos.push({
        tipo: "foto",
        buffer: Buffer.from(await f.arrayBuffer()),
        mime: f.type,
        tamanho: f.size,
      })
    }

    const audio = form.get("audio")
    if (audio instanceof File && audio.size > 0) {
      if (audio.size > LIMITE_AUDIO_BYTES) {
        return NextResponse.json({ error: "Áudio acima de 16 MB" }, { status: 400 })
      }
      arquivos.push({
        tipo: "audio",
        buffer: Buffer.from(await audio.arrayBuffer()),
        mime: typeof form.get("audio_mime") === "string" ? String(form.get("audio_mime")) : audio.type,
        tamanho: audio.size,
      })
    }

    if (!arquivos.length) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    const falhas = await anexarArquivos(id, String(os.central_id), arquivos, session.user.id)
    const atualizada = await OS.findById(id)

    return NextResponse.json({
      midias: atualizada?.midias?.length ?? 0,
      falhas,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao anexar mídia"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

/**
 * Remove uma mídia. Usa o `public_id` e o `resource_type` GRAVADOS no
 * subdocumento — diferente da rota antiga de fotos, que deduz o public_id por
 * regex do caminho e quebra se a pasta mudar.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.perfis?.length) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params

  try {
    await connectDB()
    const { midia_id } = await req.json()
    if (!midia_id) return NextResponse.json({ error: "midia_id obrigatório" }, { status: 400 })

    const os = await OS.findById(id)
    if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 })

    const midia = os.midias?.find((m: { _id: unknown }) => String(m._id) === String(midia_id))
    if (!midia) return NextResponse.json({ error: "Mídia não encontrada" }, { status: 404 })

    try {
      await deletarArquivo(midia.public_id, midia.resource_type)
    } catch {
      // Falha no Cloudinary não impede remover a referência do banco.
    }

    await OS.findByIdAndUpdate(id, { $pull: { midias: { _id: midia_id } } })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao remover mídia"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
