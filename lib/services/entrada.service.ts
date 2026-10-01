import { connectDB } from "@/lib/db"
import OS, { type IOS } from "@/models/OS"
import Central from "@/models/Central"
import "@/models/Cliente"
import { obterOuCriarClientePorTelefone } from "./cliente.service"
import { criarCentralRascunho } from "./central.service"
import { uploadArquivo, uploadAudio } from "@/lib/cloudinary"

export type ArquivoEntrada = {
  tipo: "foto" | "audio"
  buffer: Buffer
  mime?: string
  tamanho?: number
}

export type EntradaInput = {
  /** Um dos dois: cliente já escolhido, ou o telefone cru que chegou. */
  cliente_id?: string
  telefone?: string
  nome?: string
  /** Peça já no catálogo. Sem isso, nasce um rascunho. */
  central_id?: string
  apelido_peca?: string
  defeito?: string
  tipo_cliente?: "mecanico" | "usuario"
  /** Gerada no navegador. Duplo toque ou retry não criam duas OS. */
  chave_idempotencia?: string
  arquivos?: ArquivoEntrada[]
}

export type FalhaMidia = { tipo: "foto" | "audio"; motivo: string }

export type ResultadoEntrada = {
  /** `IOS` explícito: `ReturnType<typeof OS.create>` degrada para `any[]`
   *  por causa do overload que aceita array. */
  os: IOS
  reaproveitada: boolean
  /** Mídia que não subiu. Vai até a tela: perder foto em silêncio é pior que
   *  avisar, mesmo que a OS tenha sido registrada. */
  falhas: FalhaMidia[]
}

/**
 * Registra a entrada de uma peça na bancada com o mínimo possível de decisão
 * humana: só o cliente é obrigatório. Peça, defeito, foto e áudio são opcionais,
 * porque "às vezes ninguém registra" e o sistema não pode travar por isso.
 */
export async function registrarEntrada(
  input: EntradaInput,
  ctx: { usuario_id?: string } = {}
): Promise<ResultadoEntrada> {
  await connectDB()

  // Idempotência primeiro, antes de criar qualquer coisa: se a chave já foi
  // usada, devolvemos a OS de antes em vez de duplicar peça e cliente.
  if (input.chave_idempotencia) {
    const existente = (await OS.findOne({
      chave_idempotencia: input.chave_idempotencia,
    })) as IOS | null
    if (existente) return { os: existente, reaproveitada: true, falhas: [] }
  }

  // 1. Cliente
  let cliente_id = input.cliente_id
  if (!cliente_id) {
    if (!input.telefone) throw new Error("Informe o cliente ou o telefone")
    const cliente = await obterOuCriarClientePorTelefone(input.telefone, {
      nome: input.nome,
      origem: "entrada_rapida",
    })
    cliente_id = String(cliente._id)
  }

  // 2. Peça — rascunho quando ninguém escolheu nada no catálogo
  let central_id = input.central_id
  let centralCriada = false
  if (!central_id) {
    const rascunho = await criarCentralRascunho({
      apelido: input.apelido_peca,
      origem: "entrada_rapida",
      criado_por: ctx.usuario_id,
    })
    central_id = String(rascunho._id)
    centralCriada = true
  }

  // 3. OS
  let os: IOS
  try {
    os = (await OS.create({
      cliente_id,
      central_id,
      tecnico_id: ctx.usuario_id,
      defeito_descricao: input.defeito?.trim() || undefined,
      tipo_cliente: input.tipo_cliente,
      chave_idempotencia: input.chave_idempotencia,
    })) as IOS
  } catch (err) {
    // Corrida na chave de idempotência: outro request idêntico ganhou.
    if ((err as { code?: number }).code === 11000 && input.chave_idempotencia) {
      if (centralCriada) await Central.findByIdAndDelete(central_id) // não deixa peça órfã
      const existente = (await OS.findOne({
        chave_idempotencia: input.chave_idempotencia,
      })) as IOS | null
      if (existente) return { os: existente, reaproveitada: true, falhas: [] }
    }
    throw err
  }

  // 4. Rascunho sem apelido ganha o número da OS, para dar o que ler na fila
  if (centralCriada && !input.apelido_peca) {
    await Central.findByIdAndUpdate(central_id, { apelido: `Peça #${os.numero_os}` })
  }

  // 5. Mídia. Depois da OS existir de propósito: se o upload falhar, a entrada
  //    já está registrada e dá para reanexar — travar a bancada é pior.
  let falhas: FalhaMidia[] = []
  if (input.arquivos?.length) {
    falhas = await anexarArquivos(String(os._id), central_id, input.arquivos, ctx.usuario_id)
    os = (await OS.findById(os._id)) as IOS
  }

  return { os, reaproveitada: false, falhas }
}

/**
 * Sobe cada arquivo e pendura na OS. Falha de um não derruba os outros, e as
 * falhas são DEVOLVIDAS — a entrada continua registrada, mas quem está na
 * bancada precisa saber que a foto não subiu.
 */
export async function anexarArquivos(
  os_id: string,
  central_id: string,
  arquivos: ArquivoEntrada[],
  usuario_id?: string
): Promise<FalhaMidia[]> {
  await connectDB()
  const falhas: FalhaMidia[] = []

  for (const arq of arquivos) {
    try {
      const enviado =
        arq.tipo === "audio"
          ? await uploadAudio(arq.buffer, { pasta: `techcode/os/${os_id}/audio` })
          : await uploadArquivo(arq.buffer, {
              pasta: `techcode/os/${os_id}`,
              resource_type: "image",
            })

      await OS.findByIdAndUpdate(os_id, {
        $push: {
          midias: {
            tipo: arq.tipo,
            url: enviado.url,
            public_id: enviado.public_id,
            resource_type: enviado.resource_type,
            mime: arq.mime,
            tamanho: enviado.bytes || arq.tamanho || 0,
            duracao_s: enviado.duration,
            origem: "camera",
            criado_por: usuario_id,
            // Áudio entra na fila de transcrição; foto não tem o que transcrever.
            ...(arq.tipo === "audio"
              ? { transcricao: { status: "pendente", tentativas: 0 } }
              : {}),
          },
        },
      })
    } catch (err) {
      // A entrada já existe; a mídia pode ser reanexada. Mas a falha sobe.
      const motivo = extrairMotivo(err)
      console.error(`falha ao anexar ${arq.tipo} na OS ${os_id}: ${motivo}`)
      falhas.push({ tipo: arq.tipo, motivo })
    }
  }

  return falhas
}

function extrairMotivo(err: unknown): string {
  const e = err as { http_code?: number; message?: string; error?: { message?: string } }
  const base = e?.error?.message || e?.message || "erro desconhecido"
  // 401/403 do Cloudinary quase sempre é chave sem permissão de upload, e o
  // texto cru ("unexpected status code") não diz isso a ninguém.
  if (e?.http_code === 403 || e?.http_code === 401) {
    return "o serviço de imagens recusou o envio (chave sem permissão de upload)"
  }
  return base
}
