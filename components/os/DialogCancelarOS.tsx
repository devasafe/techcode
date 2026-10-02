"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const labelCls = "block text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] mb-1.5"

type Props = {
  osId: string
  numeroOS: number
  aberto: boolean
  onFechar: () => void
  onSucesso: () => void
}

/**
 * Extraído de `os/[id]/page.tsx`, que passava de 960 linhas. O diálogo é
 * autocontido: cuida do próprio estado e avisa o pai só quando termina.
 */
export function DialogCancelarOS({ osId, numeroOS, aberto, onFechar, onSucesso }: Props) {
  const [motivo, setMotivo] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  function limpar() {
    setMotivo("")
    setErro("")
  }

  async function cancelar() {
    setSalvando(true)
    setErro("")
    try {
      const res = await fetch(`/api/os/${osId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelada",
          ...(motivo.trim() && { motivo_cancelamento: motivo.trim() }),
        }),
      })
      if (!res.ok) {
        let data: { error?: string } = {}
        try {
          data = await res.json()
        } catch {
          /* corpo não-JSON */
        }
        setErro(data.error ?? "Erro ao cancelar OS.")
        return
      }
      onFechar()
      limpar()
      onSucesso()
    } catch {
      setErro("Erro de conexão. Tente novamente.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(open) => {
        if (!open) {
          onFechar()
          limpar()
        }
      }}
    >
      <DialogContent className="bg-[#111111] border-[#1C1C1C] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#F0F0F0] text-base uppercase tracking-wide">
            Cancelar OS #{numeroOS}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-[#B4B4B4]">
            A OS será marcada como cancelada. Essa ação não pode ser desfeita.
          </p>
          <div>
            <label className={labelCls}>Motivo (opcional)</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ex: cliente não aceitou o orçamento..."
              className="w-full bg-[#0C0C0C] border border-[#1C1C1C] text-base text-[#F0F0F0] px-3 py-2 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors placeholder:text-[#8A8A8A] resize-none"
            />
          </div>
          {erro && <p className="text-sm text-[#FF4444]">{erro}</p>}
          <div className="flex gap-2">
            <button
              onClick={cancelar}
              disabled={salvando}
              className="bg-[#2A0D0D] text-[#FF4444] text-sm font-bold uppercase tracking-wide px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {salvando ? "Cancelando..." : "Confirmar cancelamento"}
            </button>
            <button
              onClick={() => {
                onFechar()
                limpar()
              }}
              className="text-sm font-bold uppercase tracking-wide text-[#B4B4B4] hover:text-white px-4 py-2 border border-[#1C1C1C] rounded-sm transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
