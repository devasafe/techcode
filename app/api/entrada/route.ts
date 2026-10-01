import { NextResponse, after } from "next/server"
import { auth } from "@/auth"
import { registrarEntrada, type ArquivoEntrada } from "@/lib/services/entrada.service"
import {
  entradaSchema,
  LIMITE_FOTO_BYTES,
  LIMITE_AUDIO_BYTES,
} from "@/lib/schemas/entrada"
import { processarTranscricao } from "@/lib/services/midia.service"
import { transcricaoConfigurada } from "@/lib/transcricao"

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

    // Dois áudios com papéis diferentes: um diz O QUE É a peça, o outro O QUE
    // ELA TEM. `audio` sem sufixo é aceito como defeito, que era o formato
    // anterior desta rota.
    for (const [campo, papel] of [
      ["audio_peca", "peca"],
      ["audio_defeito", "defeito"],
      ["audio", "defeito"],
    ] as const) {
      const a = form.get(campo)
      if (!(a instanceof File) || a.size === 0) continue
      if (a.size > LIMITE_AUDIO_BYTES) {
        return NextResponse.json({ error: "Áudio acima de 16 MB" }, { status: 400 })
      }
      // Não duplica o defeito se vierem `audio_defeito` e `audio` juntos.
      if (papel === "defeito" && arquivos.some((x) => x.tipo === "audio" && x.papel === "defeito")) {
        continue
      }
      arquivos.push({
        tipo: "audio",
        papel,
        buffer: Buffer.from(await a.arrayBuffer()),
        // O mimeType real varia por plataforma (webm no Android, mp4 no iOS),
        // então vem do cliente e é guardado como veio.
        mime: str(form.get(`${campo}_mime`)) ?? a.type,
        tamanho: a.size,
      })
    }

    const { os, reaproveitada, falhas } = await registrarEntrada(
      { ...parsed.data, arquivos },
      { usuario_id: session.user.id }
    )

    // Transcreve DEPOIS de responder: quem está na bancada não espera por isso.
    // O sweeper (app/api/jobs/transcrever) recupera o que o `after` perder,
    // porque o container morre a cada deploy com 10s de grace period.
    if (!reaproveitada && transcricaoConfigurada()) {
      const audios = (os.midias ?? []).filter(
        (m) => m.tipo === "audio" && m.transcricao?.status === "pendente"
      )
      if (audios.length) {
        const os_id = String(os._id)
        const ids = audios.map((m) => String(m._id))
        after(async () => {
          for (const midia_id of ids) {
            await processarTranscricao(os_id, midia_id)
          }
        })
      }
    }

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
