/**
 * Nome com que um arquivo de ECU deve ser baixado.
 *
 * Função pura, fora do driver de armazenamento de propósito: é regra de domínio,
 * não detalhe de onde o arquivo está guardado. E é testável sozinha, sem mock.
 *
 * Não é enfeite: o download existe para gravar de volta na central, e gravar o
 * arquivo de outro carro pode estragar o carro. Então o nome carrega OS, modelo
 * e cliente, em vez do nome que o arquivo tinha na máquina.
 */
export function nomeDeDownload(partes: {
  numero_os: number
  modelo?: string
  cliente?: string
  memoria: string
  papel: string
  nome_original: string
}): string {
  const limpa = (s?: string) =>
    (s ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24)

  const ext = partes.nome_original.match(/\.[a-zA-Z0-9]{1,6}$/)?.[0] ?? ".bin"
  const pedacos = [
    `OS${partes.numero_os}`,
    limpa(partes.modelo) || "peca",
    limpa(partes.cliente) || "cliente",
    partes.memoria,
    partes.papel,
  ].filter(Boolean)

  return pedacos.join("_") + ext
}
