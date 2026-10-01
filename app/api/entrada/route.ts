import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { registrarEntrada, type ArquivoEntrada } from "@/lib/services/entrada.service"
import {
  entradaSchema,
  LIMITE_FOTO_BYTES,
  LIMITE_AUDIO_BYTES,
} from "@/lib/schemas/entrada"

/**
 * Rota única da entrada rápida. É composta de propósito: o OSForm antigo fazia
 * POST /api/os e depois um POST por foto, em série — muitos round trips no wifi
 * da oficina e nenhum lugar para ser idempotente.
 *
 * Qualquer perfil autenticado registra entrada. Exigir admin/atendente aqui
 * reproduziria a fricção que fez a v1 ser abandonada.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.perfis?.length) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const form = await req.formData()

    const campos = {
      cliente_id: str(form.get("cliente_id")),
      telefone: str(form.get("telefone")),
      nome: str(form.get("nome")),
      central_id: str(form.get("central_id")),
      apelido_peca: str(form.get("apelido_peca")),
      defeito: str(form.get("defeito")),
      tipo_cliente: str(form.get("tipo_cliente")) as "mecanico" | "usuario" | undefined,
      chave_idempotencia: str(form.get("chave_idempotencia")),
    }

    const parsed = entradaSchema.safeParse(campos)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      )
    }

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
        // O mimeType real varia por plataforma (webm no Android, mp4 no iOS),
        // então vem do cliente e é guardado como veio.
        mime: str(form.get("audio_mime")) ?? audio.type,
        tamanho: audio.size,
      })
    }

    const { os, reaproveitada, falhas } = await registrarEntrada(
      { ...parsed.data, arquivos },
      { usuario_id: session.user.id }
    )

    // 200 em vez de 201 quando foi o mesmo toque chegando duas vezes.
    return NextResponse.json(
      { _id: os._id, numero_os: os.numero_os, reaproveitada, falhas },
      { status: reaproveitada ? 200 : 201 }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao registrar entrada"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

function str(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== "string") return undefined
  const t = v.trim()
  return t === "" ? undefined : t
}
