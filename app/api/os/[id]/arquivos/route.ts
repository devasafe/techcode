import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  anexarArquivoECU,
  listarPorOS,
  removerArquivoECU,
} from "@/lib/services/arquivo-ecu.service"

/** Folgado de propósito: binário de ECU tem uns KB, não megas. */
const LIMITE_BYTES = 25 * 1024 * 1024

const MEMORIAS = ["flash", "eeprom"] as const
const PAPEIS = ["original", "modificado"] as const

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.perfis?.length) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  const { id } = await params
  try {
    return NextResponse.json(await listarPorOS(id))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

/**
 * Anexa o binário lido da central.
 *
 * Note que a rota NÃO aceita `central_id` nem `cliente_id`: o service lê os dois
 * da OS. Gravar o arquivo de um carro em outro é o risco real aqui, e a forma de
 * evitá-lo é não dar ao cliente a chance de informar o vínculo.
 */
export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.perfis?.length) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  const { id } = await params

  const declarado = Number(req.headers.get("content-length") ?? 0)
  if (declarado > LIMITE_BYTES) {
    return NextResponse.json({ error: "Arquivo acima de 25 MB" }, { status: 413 })
  }

  try {
    const form = await req.formData()

    const memoria = String(form.get("memoria") ?? "")
    const papel = String(form.get("papel") ?? "")
    if (!MEMORIAS.includes(memoria as never)) {
      return NextResponse.json({ error: "Memória deve ser flash ou eeprom" }, { status: 400 })
    }
    if (!PAPEIS.includes(papel as never)) {
      return NextResponse.json({ error: "Papel deve ser original ou modificado" }, { status: 400 })
    }

    const arquivo = form.get("arquivo")
    if (!(arquivo instanceof File) || arquivo.size === 0) {
      return NextResponse.json({ error: "Envie o arquivo" }, { status: 400 })
    }
    if (arquivo.size > LIMITE_BYTES) {
      return NextResponse.json({ error: "Arquivo acima de 25 MB" }, { status: 413 })
    }

    // Extensão NÃO é validada por lista fechada de propósito: barrar formato
    // desconhecido travaria a bancada no dia em que aparecer um novo.
    const observacao = form.get("observacao")

    const { arquivo: salvo, duplicado } = await anexarArquivoECU(
      id,
      {
        memoria: memoria as (typeof MEMORIAS)[number],
        papel: papel as (typeof PAPEIS)[number],
        buffer: Buffer.from(await arquivo.arrayBuffer()),
        nome_original: arquivo.name || "arquivo.bin",
        mime: arquivo.type || undefined,
        observacao: typeof observacao === "string" && observacao.trim() ? observacao.trim() : undefined,
      },
      { usuario_id: session.user.id }
    )

    return NextResponse.json(
      { _id: salvo._id, memoria: salvo.memoria, papel: salvo.papel, duplicado },
      { status: 201 }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao anexar arquivo"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.perfis?.length) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  const { id } = await params

  try {
    const { arquivo_id } = await req.json()
    if (!arquivo_id) {
      return NextResponse.json({ error: "arquivo_id obrigatório" }, { status: 400 })
    }
    // O service filtra por os_id: id de arquivo de outra OS não apaga nada.
    const removido = await removerArquivoECU(id, String(arquivo_id))
    if (!removido) return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao remover arquivo"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
