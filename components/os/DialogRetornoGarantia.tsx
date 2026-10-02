"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const labelCls = "block text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] mb-1.5"

type Props = {
  osId: string
  aberto: boolean
  onFechar: () => void
  onSucesso: () => void
}

/** Extraído de `os/[id]/page.tsx`. Autocontido: estado próprio, avisa ao fim. */
export function DialogRetornoGarantia({ osId, aberto, onFechar, onSucesso }: Props) {
  const [descricao, setDescricao] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  async function enviar() {
    if (!descricao.trim()) return
    setSalvando(true)
    setErro("")
    try {
      const res = await fetch(`/api/os/${osId}/retorno`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descricao }),
      })
      if (!res.ok) {
        let data: { error?: string } = {}
        try {
          data = await res.json()
        } catch {
          /* corpo não-JSON */
        }
        setErro(data.error ?? "Erro ao registrar retorno.")
        return
      }
      onFechar()
      setDescricao("")
      onSucesso()
    } catch {
      setErro("Erro de conexão. Tente novamente.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className="bg-[#111111] border-[#1C1C1C]">
        <DialogHeader>
          <DialogTitle className="text-[#F0F0F0] text-base uppercase tracking-wide">
            Registrar retorno de garantia
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Descrição do problema *</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Descreva o que o cliente relatou..."
              className="w-full bg-[#0C0C0C] border border-[#1C1C1C] text-base text-[#F0F0F0] px-3 py-2 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors placeholder:text-[#8A8A8A] resize-none"
            />
          </div>
          {erro && <p className="text-sm text-[#FF4444]">{erro}</p>}
          <div className="flex gap-2">
            <button
              onClick={enviar}
              disabled={salvando || !descricao.trim()}
              className="bg-[#E8FF47] text-black text-sm font-bold uppercase tracking-wide px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {salvando ? "Salvando..." : "Confirmar"}
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
