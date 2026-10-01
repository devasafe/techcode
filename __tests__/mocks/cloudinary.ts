/**
 * Mock do Cloudinary. O projeto não tinha nenhum, e sem isso qualquer teste que
 * toque em upload tentaria falar com a rede.
 */
export const uploadsFeitos: { pasta: string; resource_type: string }[] = []

/** Liga a falha de upload para testar que a entrada sobrevive a ela. */
export const controle: {
  falhar: boolean
  falharCom?: { http_code?: number; message?: string }
} = { falhar: false }

export async function uploadArquivo(
  _buffer: Buffer,
  opcoes: { pasta: string; public_id?: string; resource_type?: string }
) {
  if (controle.falharCom) throw controle.falharCom
  if (controle.falhar) throw new Error("cloudinary fora do ar")
  const resource_type = opcoes.resource_type === "auto" ? "image" : opcoes.resource_type ?? "image"
  uploadsFeitos.push({ pasta: opcoes.pasta, resource_type })
  const id = `${opcoes.pasta}/fake-${uploadsFeitos.length}`
  return {
    url: `https://res.cloudinary.test/${id}.jpg`,
    public_id: id,
    resource_type,
    bytes: 1234,
    format: "jpg",
    duration: resource_type === "video" ? 12.5 : undefined,
  }
}

export async function uploadAudio(buffer: Buffer, opcoes: { pasta: string; public_id?: string }) {
  return uploadArquivo(buffer, { ...opcoes, resource_type: "video" })
}

export async function deletarArquivo() {
  return { result: "ok" }
}

export function limparUploads() {
  uploadsFeitos.length = 0
  controle.falhar = false
  controle.falharCom = undefined
}
