import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export type ResourceType = "image" | "video" | "raw" | "auto"

export type ArquivoEnviado = {
  url: string
  public_id: string
  /** Precisa ser guardado: o delete no Cloudinary exige o mesmo resource_type. */
  resource_type: Exclude<ResourceType, "auto">
  bytes: number
  format?: string
  /** Só vem de áudio/vídeo, e é por isso que áudio sobe como "video". */
  duration?: number
}

export async function uploadArquivo(
  buffer: Buffer,
  opcoes: { pasta: string; public_id?: string; resource_type?: ResourceType }
): Promise<ArquivoEnviado> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: opcoes.pasta,
          public_id: opcoes.public_id,
          resource_type: opcoes.resource_type ?? "auto",
        },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error("Upload falhou"))
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            resource_type: (result.resource_type ?? "image") as Exclude<ResourceType, "auto">,
            bytes: result.bytes ?? 0,
            format: result.format,
            duration: (result as { duration?: number }).duration,
          })
        }
      )
      .end(buffer)
  })
}

/**
 * Áudio no Cloudinary é `resource_type: "video"` — é o pipeline que devolve a
 * duração de graça. Mas `.webm` somente-áudio às vezes é recusado lá, então cai
 * para "raw", que aceita qualquer coisa (e aí não há duração).
 */
export async function uploadAudio(
  buffer: Buffer,
  opcoes: { pasta: string; public_id?: string }
): Promise<ArquivoEnviado> {
  try {
    return await uploadArquivo(buffer, { ...opcoes, resource_type: "video" })
  } catch {
    return uploadArquivo(buffer, { ...opcoes, resource_type: "raw" })
  }
}

export async function deletarArquivo(
  publicId: string,
  resource_type: Exclude<ResourceType, "auto"> = "image"
) {
  return cloudinary.uploader.destroy(publicId, { resource_type })
}
