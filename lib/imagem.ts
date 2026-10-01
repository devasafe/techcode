/**
 * Reduz a foto no NAVEGADOR antes de subir.
 *
 * Não é enfeite: foto de celular tem 4-6 MB, e 40 por dia estouram o free tier
 * do Cloudinary (6 GB/mês) além de serem a maior fonte de demora no wifi da
 * oficina. Depois do downscale ficam em ~300 KB.
 */
const LADO_MAXIMO = 1600
const QUALIDADE = 0.8

export async function reduzirImagem(arquivo: File): Promise<File> {
  // Só mexe no que é imagem raster; se algo falhar, sobe o original.
  if (!arquivo.type.startsWith("image/")) return arquivo

  try {
    // `imageOrientation: "from-image"` aplica o EXIF por nós — sem isso, foto de
    // iPhone sobe deitada.
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" })

    const maior = Math.max(bitmap.width, bitmap.height)
    const escala = maior > LADO_MAXIMO ? LADO_MAXIMO / maior : 1
    const largura = Math.round(bitmap.width * escala)
    const altura = Math.round(bitmap.height * escala)

    const canvas = document.createElement("canvas")
    canvas.width = largura
    canvas.height = altura
    const ctx = canvas.getContext("2d")
    if (!ctx) return arquivo
    ctx.drawImage(bitmap, 0, 0, largura, altura)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALIDADE)
    )
    if (!blob) return arquivo

    // Se por acaso ficou maior (foto já pequena e muito comprimida), fica o original.
    if (blob.size >= arquivo.size) return arquivo

    return new File([blob], trocarExtensao(arquivo.name), { type: "image/jpeg" })
  } catch {
    return arquivo
  }
}

function trocarExtensao(nome: string) {
  return nome.replace(/\.[^.]+$/, "") + ".jpg"
}

export function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
