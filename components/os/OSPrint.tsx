import type { OSStatus } from "@/types"

type Peca = { nome: string; custo: number }

type OSPrintProps = {
  os: {
    numero_os: number
    status: OSStatus
    defeito_descricao: string
    solucao_descricao?: string
    pecas: Peca[]
    valor_cobrado: number
    custo_total_pecas: number
    garantia_dias: number
    garantia_ate?: string
    created_at: string
    closed_at?: string
    cliente_id: { nome: string; telefone: string } | null
    central_id: { marca: string; modelo: string; codigo: string } | null
    devolucao?: {
      tipo: string
      motivo: string
      valor_reembolsado?: number
      central_adquirida?: string
      custo_central?: number
      novo_valor_cobrado?: number
      data: string
    }
  }
}

export function OSPrint({ os }: OSPrintProps) {
  const dataAbertura = new Date(os.created_at).toLocaleDateString("pt-BR")
  const dataConclusao = os.closed_at ? new Date(os.closed_at).toLocaleDateString("pt-BR") : null
  const garantiaAte = os.garantia_ate ? new Date(os.garantia_ate).toLocaleDateString("pt-BR") : null

  const substituida = os.status === "substituida"
  const receita = substituida ? (os.devolucao?.novo_valor_cobrado ?? 0) : os.valor_cobrado

  return (
    <div className="hidden print:block print-os">
      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, paddingBottom: 16, borderBottom: "2px solid #000" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2, fontFamily: "monospace" }}>
            TECH CODE
          </div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
            Laboratório de Reparo de Centrais Automotivas
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace" }}>
            OS #{os.numero_os}
          </div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
            Abertura: {dataAbertura}
          </div>
          {dataConclusao && (
            <div style={{ fontSize: 10, color: "#555" }}>
              Conclusão: {dataConclusao}
            </div>
          )}
        </div>
      </div>

      {/* Dados do cliente e central */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#555", marginBottom: 6 }}>
            Cliente
          </div>
          {os.cliente_id ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{os.cliente_id.nome}</div>
              <div style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>{os.cliente_id.telefone}</div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "#999" }}>—</div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#555", marginBottom: 6 }}>
            Central
          </div>
          {os.central_id ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {os.central_id.marca} {os.central_id.modelo}
              </div>
              <div style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>
                Cód: {os.central_id.codigo}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "#999" }}>—</div>
          )}
        </div>
      </div>

      {/* Defeito */}
      <div style={{ marginBottom: 20, padding: 12, border: "1px solid #ddd", borderRadius: 4 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#555", marginBottom: 6 }}>
          Defeito relatado
        </div>
        <div style={{ fontSize: 12 }}>{os.defeito_descricao}</div>
      </div>

      {/* Solução */}
      {os.solucao_descricao && (
        <div style={{ marginBottom: 20, padding: 12, border: "1px solid #ddd", borderRadius: 4 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#555", marginBottom: 6 }}>
            Solução aplicada
          </div>
          <div style={{ fontSize: 12 }}>{os.solucao_descricao}</div>
        </div>
      )}

      {/* Devolução */}
      {os.devolucao && (
        <div style={{ marginBottom: 20, padding: 12, border: "1px solid #ddd", borderRadius: 4 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#555", marginBottom: 6 }}>
            {os.devolucao.tipo === "reembolso" ? "Devolução — Reembolso" : "Devolução — Substituição de central"}
          </div>
          <div style={{ fontSize: 12 }}>{os.devolucao.motivo}</div>
          {os.devolucao.central_adquirida && (
            <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
              Central substituta: {os.devolucao.central_adquirida}
            </div>
          )}
        </div>
      )}

      {/* Valores */}
      <div style={{ marginBottom: 24, padding: 12, border: "1px solid #ddd", borderRadius: 4 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#555", marginBottom: 10 }}>
          Resumo financeiro
        </div>

        {os.pecas.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            {os.pecas.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#555", marginBottom: 2 }}>
                <span>{p.nome}</span>
                <span style={{ fontFamily: "monospace" }}>R$ {p.custo.toFixed(2).replace(".", ",")}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid #eee", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#555" }}>
              <span>Custo de peças</span>
              <span style={{ fontFamily: "monospace" }}>R$ {os.custo_total_pecas.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, paddingTop: 6, borderTop: "1px solid #ccc" }}>
          <span>Total cobrado</span>
          <span style={{ fontFamily: "monospace" }}>R$ {receita.toFixed(2).replace(".", ",")}</span>
        </div>
      </div>

      {/* Garantia */}
      {garantiaAte && (
        <div style={{ marginBottom: 24, fontSize: 11, color: "#555" }}>
          Garantia de {os.garantia_dias} dias — válida até <strong>{garantiaAte}</strong>
        </div>
      )}

      {/* Rodapé */}
      <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ fontSize: 9, color: "#999" }}>
          Tech Code — Laboratório de Reparo de Centrais Automotivas
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ borderTop: "1px solid #000", width: 180, marginBottom: 4 }} />
          <div style={{ fontSize: 10 }}>Assinatura do cliente</div>
          <div style={{ fontSize: 9, color: "#999", marginTop: 2 }}>{os.cliente_id?.nome ?? ""}</div>
        </div>
      </div>
    </div>
  )
}
