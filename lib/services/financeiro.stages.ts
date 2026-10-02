import type { PipelineStage } from "mongoose"

/**
 * A conta do dinheiro, em UM lugar só.
 *
 * Três status movem dinheiro, e cada um guarda os valores num lugar diferente:
 *
 *  - `concluida`   → `valor_cobrado` e `custo_total_pecas` na raiz da OS
 *  - `substituida` → `devolucao.novo_valor_cobrado` e `devolucao.custo_central`
 *                    (a raiz fica com o valor da conclusão original, que é obsoleto)
 *  - `devolvida`   → cobrou e devolveu: a receita efetiva é
 *                    `valor_cobrado - devolucao.valor_reembolsado`, e a peça
 *                    gasta continua sendo prejuízo
 *
 * Somar `lucro_liquido` direto dá número errado nos dois últimos casos, porque
 * `registrarDevolucao` muda o status e grava `devolucao.*` mas NÃO recalcula a
 * raiz. É por isso que estes stages existem, e por isso toda agregação de
 * dinheiro — dashboard, financeiro, gaveta do cliente, gaveta da central —
 * precisa usar os mesmos: três lugares calculando lucro de formas diferentes é
 * como relatório financeiro deixa de fechar.
 *
 * A comissão do técnico NÃO é descontada aqui. Ela é subtraída num segundo passo
 * onde faz sentido (totais do dashboard), e deixada de fora nas gavetas para o
 * número fechar com o "Lucro líquido" que aparece dentro de cada OS.
 */
export const ADD_FINANCEIRO: PipelineStage.AddFields = {
  $addFields: {
    _receita: {
      $switch: {
        branches: [
          {
            case: { $eq: ["$status", "substituida"] },
            then: { $ifNull: ["$devolucao.novo_valor_cobrado", 0] },
          },
          {
            case: { $eq: ["$status", "devolvida"] },
            then: {
              $subtract: [
                { $ifNull: ["$valor_cobrado", 0] },
                { $ifNull: ["$devolucao.valor_reembolsado", 0] },
              ],
            },
          },
        ],
        default: { $ifNull: ["$valor_cobrado", 0] },
      },
    },
    _custo: {
      $switch: {
        branches: [
          {
            case: { $eq: ["$status", "substituida"] },
            then: { $ifNull: ["$devolucao.custo_central", 0] },
          },
        ],
        default: { $ifNull: ["$custo_total_pecas", 0] },
      },
    },
  },
}

/** `_lucro` depende de `_receita` e `_custo`, então vem num segundo stage. */
export const ADD_LUCRO: PipelineStage.AddFields = {
  $addFields: {
    _lucro: { $subtract: ["$_receita", "$_custo"] },
  },
}

/**
 * Filtro dos status que movem dinheiro, cada um com a data que o marca no tempo.
 *
 * `concluida` usa `closed_at`; `substituida` e `devolvida` usam `devolucao.data`,
 * porque é quando o dinheiro de fato mudou de lado.
 */
export function matchFinanceiro(range?: { $gte: Date; $lte?: Date } | null) {
  if (!range) {
    return { status: { $in: ["concluida", "substituida", "devolvida"] } }
  }
  return {
    $or: [
      { status: "concluida", closed_at: range },
      { status: { $in: ["substituida", "devolvida"] }, "devolucao.data": range },
    ],
  }
}

/** Os dois stages na ordem certa, para quem só quer somar. */
export const STAGES_FINANCEIRO = [ADD_FINANCEIRO, ADD_LUCRO]
