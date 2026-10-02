/** Mock do armazenamento. Mantém o contrato de lib/storage sem tocar na rede. */
export const guardados: { pasta: string }[] = []
export const removidos: string[] = []

export const STORAGE_ATUAL = "teste"

export async function guardar(buffer: Buffer, opcoes: { pasta: string }) {
  guardados.push({ pasta: opcoes.pasta })
  const id = `${opcoes.pasta}/fake-${guardados.length}`
  return {
    url: `https://storage.test/${id}`,
    public_id: id,
    storage: "teste",
    resource_type: "raw",
    bytes: buffer.length,
  }
}

export async function remover(ref: { public_id: string }) {
  removidos.push(ref.public_id)
  return { result: "ok" }
}

export function limpar() {
  guardados.length = 0
  removidos.length = 0
}
