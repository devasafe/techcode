import { uploadArquivo, deletarArquivo, type ResourceType } from "@/lib/cloudinary"

/**
 * Camada fina sobre o armazenamento de arquivos.
 *
 * Existe porque o dono já disse que vai migrar para o MinIO que roda na VPS
 * (`fitcdn.satriz.club`). Com esta indireção, trocar o backend é escrever uma
 * segunda implementação e virar uma env — sem tocar em nenhuma tela.
 *
 * Cada arquivo guarda em qual backend foi gravado (`storage`), então os dois
 * podem coexistir durante a migração: o que está no Cloudinary continua sendo
 * lido de lá.
 */

export type RefArmazenada = {
  url: string
  public_id: string
  storage: string
  resource_type: string
  bytes: number
}

export const STORAGE_ATUAL = process.env.STORAGE_BACKEND || "cloudinary"

export async function guardar(
  buffer: Buffer,
  opcoes: { pasta: string; resource_type?: ResourceType }
): Promise<RefArmazenada> {
  // Binário de ECU vai como "raw": o Cloudinary não tenta interpretar o conteúdo.
  const enviado = await uploadArquivo(buffer, {
    pasta: opcoes.pasta,
    resource_type: opcoes.resource_type ?? "raw",
  })
  return {
    url: enviado.url,
    public_id: enviado.public_id,
    storage: "cloudinary",
    resource_type: enviado.resource_type,
    bytes: enviado.bytes,
  }
}

export async function remover(ref: {
  public_id: string
  resource_type?: string
  storage?: string
}) {
  // Backend desconhecido (migração futura): não tenta adivinhar.
  if (ref.storage && ref.storage !== "cloudinary") return { result: "ignorado" }
  return deletarArquivo(
    ref.public_id,
    (ref.resource_type as Exclude<ResourceType, "auto">) ?? "raw"
  )
}
