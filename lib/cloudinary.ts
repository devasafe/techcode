import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function uploadArquivo(
  buffer: Buffer,
  opcoes: { pasta: string; public_id?: string; resource_type?: "image" | "raw" | "auto" }
): Promise<{ url: string; public_id: string }> {
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
          resolve({ url: result.secure_url, public_id: result.public_id })
        }
      )
      .end(buffer)
  })
}

export async function deletarArquivo(publicId: string, resource_type: "image" | "raw" = "image") {
  return cloudinary.uploader.destroy(publicId, { resource_type })
}
