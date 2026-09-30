/**
 * Migração da Fase 0. Idempotente — pode rodar de novo sem estragar nada.
 *
 *   npx tsx scripts/migrar-fase0.ts            (dry-run, não escreve)
 *   npx tsx scripts/migrar-fase0.ts --apply    (escreve)
 *
 * Faz quatro coisas:
 *  1. Semeia o Contador com o maior numero_os existente. SEM ISSO o contador
 *     começa em 1 e colide com as OS que já existem.
 *  2. Preenche telefone_e164 nos clientes antigos, que é a chave de dedup.
 *  3. Marca as centrais antigas como "confirmada" (elas têm marca/modelo/código),
 *     para não sumirem do autocomplete, que agora esconde rascunhos.
 *  4. Dropa o índice de texto antigo de `centrals` — MongoDB aceita só um por
 *     coleção, e o novo inclui apelido e termos_busca.
 */
import mongoose from "mongoose"
import { readFileSync } from "fs"
import { normalizarE164, formatarBR } from "../lib/telefone"

/**
 * Lê o .env.local sem `dotenv` (que está em node_modules só transitivamente, não
 * declarado). Env já presente no ambiente tem prioridade, o que permite apontar
 * para produção com `MONGODB_URI=... npx tsx scripts/migrar-fase0.ts`.
 */
function carregarEnvLocal() {
  if (process.env.MONGODB_URI) return
  try {
    const txt = readFileSync(".env.local", "utf8")
    for (const linha of txt.split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)$/)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "")
      }
    }
  } catch {
    // sem .env.local: a env tem de vir do ambiente
  }
}
carregarEnvLocal()

const APLICAR = process.argv.includes("--apply")
const log = (...a: unknown[]) => console.log(APLICAR ? "[APLICA]" : "[dry-run]", ...a)

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error("MONGODB_URI não definida")

  await mongoose.connect(uri)
  const db = mongoose.connection.db!
  console.log(`Conectado em "${db.databaseName}"\n`)

  // 1. Contador de numero_os
  const maiorOS = await db
    .collection("os")
    .find({}, { projection: { numero_os: 1 } })
    .sort({ numero_os: -1 })
    .limit(1)
    .toArray()
  const maior = maiorOS[0]?.numero_os ?? 0
  const atual = await db.collection("contadors").findOne({ _id: "os" as never })
  log(`contador os: maior numero_os = ${maior}, contador atual = ${atual?.seq ?? "(inexistente)"}`)
  if (APLICAR) {
    // $max é o que torna isto idempotente: nunca anda para trás.
    await db
      .collection("contadors")
      .updateOne({ _id: "os" as never }, { $max: { seq: maior } }, { upsert: true })
    const depois = await db.collection("contadors").findOne({ _id: "os" as never })
    log(`contador os agora = ${depois?.seq}`)
  }

  // 2. telefone_e164 nos clientes
  const clientes = await db
    .collection("clientes")
    .find({ telefone_e164: { $exists: false } }, { projection: { nome: 1, telefone: 1 } })
    .toArray()
  let normalizados = 0
  const semE164: string[] = []
  for (const c of clientes) {
    const e164 = normalizarE164(c.telefone as string)
    if (!e164) {
      semE164.push(`${c.nome} (${c.telefone})`)
      continue
    }
    if (APLICAR) {
      await db.collection("clientes").updateOne(
        { _id: c._id },
        {
          $set: {
            telefone_e164: e164,
            telefone: formatarBR(e164),
            nome_confirmado: true, // nome foi digitado por humano na v1
            origem: "manual",
          },
        }
      )
    }
    normalizados++
  }
  log(`clientes: ${normalizados} normalizados, ${semE164.length} sem telefone válido`)
  for (const n of semE164) log(`  fica de fora do dedup: ${n}`)

  // 3. status_catalogo nas centrais
  const centrais = await db
    .collection("centrals")
    .find({ status_catalogo: { $exists: false } }, { projection: { marca: 1, modelo: 1, codigo: 1 } })
    .toArray()
  let confirmadas = 0
  let rascunhos = 0
  for (const ce of centrais) {
    const completa = Boolean(ce.marca && ce.modelo && ce.codigo)
    if (APLICAR) {
      await db
        .collection("centrals")
        .updateOne(
          { _id: ce._id },
          { $set: { status_catalogo: completa ? "confirmada" : "rascunho", origem: "manual" } }
        )
      await db
        .collection("centrals")
        .updateOne({ _id: ce._id, created_at: { $exists: false } }, { $set: { created_at: new Date() } })
    }
    if (completa) confirmadas++
    else rascunhos++
  }
  log(`centrais: ${confirmadas} -> confirmada, ${rascunhos} -> rascunho`)

  // 4. índice de texto antigo de centrals
  const indices = await db.collection("centrals").indexes()
  const textoAntigo = indices.find(
    (i) =>
      (i.key as Record<string, unknown>)?._fts === "text" &&
      !JSON.stringify(i.weights ?? {}).includes("termos_busca")
  )
  if (textoAntigo) {
    log(`índice de texto antigo: ${textoAntigo.name} (pesos ${JSON.stringify(textoAntigo.weights)})`)
    if (APLICAR) {
      await db.collection("centrals").dropIndex(textoAntigo.name!)
      log("dropado; o novo é criado pelo Mongoose no próximo uso do model")
    }
  } else {
    log("nenhum índice de texto antigo para dropar")
  }

  await mongoose.disconnect()
  console.log(APLICAR ? "\nMigração aplicada." : "\nDry-run. Rode com --apply para escrever.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
