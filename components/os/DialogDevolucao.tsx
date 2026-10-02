"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const labelCls = "block text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] mb-1.5"
const inputCls =
  "w-full bg-[#0C0C0C] border border-[#1C1C1C] text-base text-[#F0F0F0] px-3 py-2 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors placeholder:text-[#8A8A8A]"

type Props = {
  osId: string
  aberto: boolean
  onFechar: () => void
  onSucesso: () => void
}

/** Extraído de `os/[id]/page.tsx`. Carrega os 7 estados que eram do pai. */
export function DialogDevolucao({ osId, aberto, onFechar, onSucesso }: Props) {
  const [tipo, setTipo] = useState<"reembolso" | "substituicao">("reembolso")
  const [motivo, setMotivo] = useState("")
  const [valorReembolsado, setValorReembolsado] = useState("0")
  const [centralAdquirida, setCentralAdquirida] = useState("")
  const [custoCentral, setCustoCentral] = useState("0")
  const [novoValorCobrado, setNovoValorCobrado] = useState("0")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  async function enviar() {
    if (!motivo.trim()) return
    setSalvando(true)
    setErro("")
    try {
      const body: Record<string, unknown> = { tipo, motivo }
      if (tipo === "reembolso") {
        body.valor_reembolsado = parseFloat(valorReembolsado) || 0
      } else {
        body.central_adquirida = centralAdquirida
        body.custo_central = parseFloat(custoCentral) || 0
        body.novo_valor_cobrado = parseFloat(novoValorCobrado) || 0
      }
      const res = await fetch(`/api/os/${osId}/devolucao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        let data: { error?: string } = {}
        try {
          data = await res.json()
        } catch {
          /* corpo não-JSON */
        }
        setErro(data.error ?? "Erro ao registrar devolução.")
        return
      }
      onFechar()
      onSucesso()
    } catch {
      setErro("Erro de conexão. Tente novamente.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className="bg-[#111111] border-[#1C1C1C] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#F0F0F0] text-base uppercase tracking-wide">
            Registrar devolução
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Tipo de devolução</label>
            <Select
              value={tipo}
              onValueChange={(v) => setTipo(v as "reembolso" | "substituicao")}
            >
              <SelectTrigger className="bg-[#0C0C0C] border-[#1C1C1C] text-[#F0F0F0] text-sm rounded-sm focus:ring-0 focus:border-[#E8FF47]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111111] border-[#1C1C1C]">
                <SelectItem value="reembolso" className="text-[#F0F0F0] focus:bg-[#1C1C1C] text-sm">
                  Reembolso
                </SelectItem>
                <SelectItem
                  value="substituicao"
                  className="text-[#F0F0F0] focus:bg-[#1C1C1C] text-sm"
                >
                  Substituição de central
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className={labelCls}>Motivo *</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              placeholder="Motivo da devolução..."
              className="w-full bg-[#0C0C0C] border border-[#1C1C1C] text-base text-[#F0F0F0] px-3 py-2 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors placeholder:text-[#8A8A8A] resize-none"
            />
          </div>

          {tipo === "reembolso" && (
            <div>
              <label className={labelCls}>Valor reembolsado (R$)</label>
              <input
                value={valorReembolsado}
                onChange={(e) => setValorReembolsado(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
              />
            </div>
          )}

          {tipo === "substituicao" && (
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Central substituta</label>
                <input
                  value={centralAdquirida}
                  onChange={(e) => setCentralAdquirida(e.target.value)}
                  placeholder="Ex: Bosch ME17 recondicionada"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Custo da central (R$)</label>
                  <input
                    value={custoCentral}
                    onChange={(e) => setCustoCentral(e.target.value)}
                    type="number"
                    step="0.01"
                    min="0"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Novo valor cobrado (R$)</label>
                  <input
                    value={novoValorCobrado}
                    onChange={(e) => setNovoValorCobrado(e.target.value)}
                    type="number"
                    step="0.01"
                    min="0"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )}

          {erro && <p className="text-sm text-[#FF4444]">{erro}</p>}

          <div className="flex gap-2">
            <button
              onClick={enviar}
              disabled={salvando || !motivo.trim()}
              className="bg-[#E8FF47] text-black text-sm font-bold uppercase tracking-wide px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {salvando ? "Salvando..." : "Confirmar devolução"}
            </button>
            <button
              onClick={onFechar}
              className="text-sm font-bold uppercase tracking-wide text-[#B4B4B4] hover:text-white px-4 py-2 border border-[#1C1C1C] rounded-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
