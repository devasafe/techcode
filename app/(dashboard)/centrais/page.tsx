import { redirect } from "next/navigation"

/**
 * A lista de centrais foi substituída pelo /acervo, que faz o mesmo e mais:
 * busca pelo que foi falado nos áudios, cards com foto, e as peças ainda a
 * identificar. Duas telas para a mesma coisa é como o sistema fica confuso.
 *
 * Fica como redirect em vez de ser apagada para não quebrar link salvo nem o
 * histórico do navegador de quem já usava. A gaveta `/centrais/[id]` continua
 * existindo normalmente — ela é o detalhe, não a lista.
 */
export default function CentraisPage() {
  redirect("/acervo")
}
