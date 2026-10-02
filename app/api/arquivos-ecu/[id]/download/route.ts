import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { connectDB } from "@/lib/db"
import ArquivoECU from "@/models/ArquivoECU"
import { nomeParaDownload } from "@/lib/services/arquivo-ecu.service"
import "@/models/Central"
import "@/models/Cliente"
import "@/models/OS"

/**
 * Download do binário de ECU.
 *
 * A tela NUNCA recebe a URL do armazenamento — ela conhece só
 * `/api/arquivos-ecu/<id>/download`. É isso que torna a migração para o MinIO da
 * VPS uma troca de env em vez de um refactor de telas: muda o que este handler
 * resolve, e nada mais.
 *
 * É também o único ponto onde dá para controlar quem baixa o quê. Hoje a URL do
 * Cloudinary é pública e permanente; com um armazenamento privado, aqui é onde a
 * URL assinada de vida curta passaria a ser gerada.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.perfis?.length) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params

  try {
    await connectDB()
    const arquivo = await ArquivoECU.findById(id).lean()
    if (!arquivo) return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 })

    // O nome carrega OS, modelo e cliente: é o que evita gravar o arquivo de um
    // carro em outro depois de baixar.
    const nome = (await nomeParaDownload(id)) ?? arquivo.nome_original

    return NextResponse.redirect(arquivo.url, {
      status: 302,
      headers: {
        // Informativo no redirect, mas deixa o nome registrado na resposta.
        "Content-Disposition": `attachment; filename="${nome.replace(/"/g, "")}"`,
        "X-Arquivo-Nome": nome,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao baixar"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
