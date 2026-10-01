import { Types } from "mongoose"
import { connectDB } from "@/lib/db"
import OS, { type IOS } from "@/models/OS"
import { acrescentarTermosBusca } from "./central.service"
import { transcrever, baixarMidia, ErroTranscricao } from "@/lib/transcricao"

/** Depois disto, um "processando" é considerado abandonado (container morreu). */
export const TIMEOUT_CLAIM_MIN = 5
export const MAX_TENTATIVAS = 3

/**
 * Marca a mídia como "processando" de forma ATÔMICA.
 *
 * É o "lock sem Redis": se devolver null, outro processo já pegou. Sem isso, um
 * deploy no meio de uma transcrição faria o `after()` e o cron trabalharem no
 * mesmo áudio — trabalho e cobrança em dobro.
 */
export async function claimTranscricao(os_id: string, midia_id: string) {
  await connectDB()
  return OS.findOneAndUpdate(
    {
      _id: os_id,
      midias: {
        $elemMatch: {
          _id: new Types.ObjectId(midia_id),
          "transcricao.status": "pendente",
          "transcricao.tentativas": { $lt: MAX_TENTATIVAS },
        },
      },
    },
    {
      $set: {
        "midias.$[m].transcricao.status": "processando",
        "midias.$[m].transcricao.claim_at": new Date(),
      },
      $inc: { "midias.$[m].transcricao.tentativas": 1 },
    },
    {
      arrayFilters: [{ "m._id": new Types.ObjectId(midia_id) }],
      returnDocument: "after",
    }
  )
}

/**
 * Grava o texto em três lugares, cada um com um papel:
 *  - na mídia: a fonte, com proveniência (provedor/modelo)
 *  - em `OS.defeito_transcrito`: campo derivado, SEPARADO de `defeito_descricao`
 *    para a máquina nunca apagar o que a pessoa digitou
 *  - em `Central.termos_busca`: é o que o índice de texto varre (acervo)
 */
export async function salvarTranscricao(
  os_id: string,
  midia_id: string,
  resultado: { texto: string; provedor: string; modelo: string }
) {
  await connectDB()

  const os = (await OS.findOneAndUpdate(
    { _id: os_id },
    {
      $set: {
        "midias.$[m].transcricao.status": "concluida",
        "midias.$[m].transcricao.texto": resultado.texto,
        "midias.$[m].transcricao.provedor": resultado.provedor,
        "midias.$[m].transcricao.modelo": resultado.modelo,
        "midias.$[m].transcricao.erro": undefined,
        defeito_transcrito: resultado.texto,
      },
    },
    {
      arrayFilters: [{ "m._id": new Types.ObjectId(midia_id) }],
      returnDocument: "after",
    }
  )) as IOS | null

  if (os?.central_id) {
    await acrescentarTermosBusca(String(os.central_id), resultado.texto)
  }

  return os
}

export async function marcarFalha(
  os_id: string,
  midia_id: string,
  motivo: string,
  podeTentarDeNovo: boolean
) {
  await connectDB()
  // Volta para "pendente" quando vale tentar de novo; vira "falhou" quando não.
  return OS.findOneAndUpdate(
    { _id: os_id },
    {
      $set: {
        "midias.$[m].transcricao.status": podeTentarDeNovo ? "pendente" : "falhou",
        "midias.$[m].transcricao.erro": motivo.slice(0, 300),
        "midias.$[m].transcricao.claim_at": undefined,
      },
    },
    {
      arrayFilters: [{ "m._id": new Types.ObjectId(midia_id) }],
      returnDocument: "after",
    }
  )
}

/**
 * Transcreve uma mídia, do claim ao texto gravado. Seguro de chamar em
 * paralelo: quem não ganhar o claim sai sem fazer nada.
 */
export async function processarTranscricao(os_id: string, midia_id: string) {
  const os = (await claimTranscricao(os_id, midia_id)) as IOS | null
  if (!os) return { processou: false, motivo: "outro processo pegou, ou não está pendente" }

  const midia = os.midias?.find((m) => String(m._id) === String(midia_id))
  if (!midia) {
    return { processou: false, motivo: "mídia não encontrada" }
  }

  try {
    const bytes = await baixarMidia(midia.url)
    const resultado = await transcrever(bytes, { mime: midia.mime })
    await salvarTranscricao(os_id, midia_id, resultado)
    return { processou: true, texto: resultado.texto }
  } catch (err) {
    const podeTentar = err instanceof ErroTranscricao ? err.reenfileirar : true
    const motivo = err instanceof Error ? err.message : "erro desconhecido"
    // Esgotou as tentativas: para de reenfileirar mesmo que o erro seja transitório.
    const tentativas = midia.transcricao?.tentativas ?? 1
    await marcarFalha(os_id, midia_id, motivo, podeTentar && tentativas < MAX_TENTATIVAS)
    return { processou: false, motivo }
  }
}

/**
 * Devolve à fila o que ficou preso em "processando" — sinal de que o container
 * caiu no meio (deploy, OOM). Sem isso, a mídia ficaria travada para sempre.
 */
export async function reenfileirarTravadas(minutos = TIMEOUT_CLAIM_MIN) {
  await connectDB()
  const limite = new Date(Date.now() - minutos * 60 * 1000)
  const res = await OS.updateMany(
    {
      midias: {
        $elemMatch: {
          "transcricao.status": "processando",
          "transcricao.claim_at": { $lt: limite },
        },
      },
    },
    { $set: { "midias.$[m].transcricao.status": "pendente" } },
    {
      arrayFilters: [
        {
          "m.transcricao.status": "processando",
          "m.transcricao.claim_at": { $lt: limite },
        },
      ],
    }
  )
  return res.modifiedCount ?? 0
}

/** Áudios esperando transcrição, do mais antigo para o mais novo. */
export async function listarPendentes(limite = 10) {
  await connectDB()
  const docs = (await OS.find({
    midias: {
      $elemMatch: {
        tipo: "audio",
        "transcricao.status": "pendente",
        "transcricao.tentativas": { $lt: MAX_TENTATIVAS },
      },
    },
  })
    .sort({ created_at: 1 })
    .limit(limite)) as IOS[]

  const fila: { os_id: string; midia_id: string }[] = []
  for (const os of docs) {
    for (const m of os.midias ?? []) {
      if (
        m.tipo === "audio" &&
        m.transcricao?.status === "pendente" &&
        (m.transcricao?.tentativas ?? 0) < MAX_TENTATIVAS
      ) {
        fila.push({ os_id: String(os._id), midia_id: String(m._id) })
      }
    }
  }
  return fila.slice(0, limite)
}

/**
 * Correção humana. Guarda o texto original junto: com 20-30 correções dá para
 * ver que jargão o transcritor erra sistematicamente e alimentar o vocabulário
 * com dado em vez de palpite.
 */
export async function corrigirTranscricao(
  os_id: string,
  midia_id: string,
  texto: string,
  usuario_id?: string
) {
  await connectDB()
  const os = (await OS.findById(os_id)) as IOS | null
  const midia = os?.midias?.find((m) => String(m._id) === String(midia_id))
  const original = midia?.transcricao?.texto

  return OS.findOneAndUpdate(
    { _id: os_id },
    {
      $set: {
        "midias.$[m].transcricao.texto": texto.trim(),
        "midias.$[m].transcricao.status": "concluida",
        ...(original && !midia?.transcricao?.texto_original
          ? { "midias.$[m].transcricao.texto_original": original }
          : {}),
        ...(usuario_id ? { "midias.$[m].transcricao.corrigida_por": usuario_id } : {}),
        defeito_transcrito: texto.trim(),
      },
    },
    {
      arrayFilters: [{ "m._id": new Types.ObjectId(midia_id) }],
      returnDocument: "after",
    }
  )
}
