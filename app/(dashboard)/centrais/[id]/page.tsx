"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CentralForm } from "@/components/centrais/CentralForm"
import { ArrowLeft, Pencil, Wrench } from "lucide-react"

type Central = {
  _id: string
  marca: string
  modelo: string
  codigo: string
  descricao?: string
}

type Reparo = {
  _id: string
  numero_os: number
  defeito_descricao: string
  solucao_descricao?: string
  closed_at: string
  cliente_id: { nome: string } | null
}

export default function CentralDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [central, setCentral] = useState<Central | null>(null)
  const [reparos, setReparos] = useState<Reparo[]>([])
  const [editando, setEditando] = useState(false)
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    setCarregando(true)
    try {
      const [resCentral, resReparos] = await Promise.all([
        fetch(`/api/centrais/${id}`),
        fetch(`/api/centrais/${id}/reparos`),
      ])
      if (!resCentral.ok) { router.push("/centrais"); return }
      const [dadosCentral, dadosReparos] = await Promise.all([
        resCentral.json(),
        resReparos.ok ? resReparos.json() : [],
      ])
      setCentral(dadosCentral)
      setReparos(dadosReparos)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [id])

  if (carregando) return <p className="text-xs uppercase tracking-widest text-[#555555]">Carregando...</p>
  if (!central) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/centrais")}
          className="text-[#555555] hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-semibold uppercase tracking-widest text-[#F0F0F0]">
            {central.marca} <span className="font-mono text-[#E8FF47]">{central.modelo}</span>
          </h1>
          <p className="font-mono text-[10px] text-[#555555] mt-0.5">{central.codigo}</p>
        </div>
        <button
          onClick={() => setEditando(true)}
          className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#555555] hover:text-white transition-colors"
        >
          <Pencil size={12} />
          Editar
        </button>
      </div>

      {central.descricao && (
        <p className="text-sm text-[#555555]">{central.descricao}</p>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1C1C1C]">
          <Wrench size={12} className="text-[#555555]" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#555555]">Base de Conhecimento</span>
          {reparos.length > 0 && (
            <span className="font-mono text-xs text-[#555555]">{reparos.length}</span>
          )}
        </div>

        <div className="space-y-3">
          {reparos.map((r) => (
            <div key={r._id} className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#E8FF47]">#{r.numero_os}</span>
                  {r.cliente_id && (
                    <span className="text-xs text-[#555555]">— {r.cliente_id.nome}</span>
                  )}
                </div>
                {r.closed_at && (
                  <span className="font-mono text-[10px] text-[#555555]">
                    {new Date(r.closed_at).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-[#555555] mb-0.5">Defeito</p>
                  <p className="text-sm text-[#F0F0F0]">{r.defeito_descricao}</p>
                </div>
                {r.solucao_descricao && (
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-[#22C55E] mb-0.5">Solução</p>
                    <p className="text-sm text-[#F0F0F0]">{r.solucao_descricao}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
          {reparos.length === 0 && (
            <div className="border border-dashed border-[#1C1C1C] rounded-sm p-8 text-center">
              <p className="text-xs text-[#555555]">Nenhum reparo concluído registrado para este modelo.</p>
              <p className="text-[10px] text-[#333333] mt-1">Reparos aparecerão aqui quando OS forem concluídas.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="bg-[#111111] border-[#1C1C1C]">
          <DialogHeader>
            <DialogTitle className="text-[#F0F0F0] text-sm uppercase tracking-widest">Editar central</DialogTitle>
          </DialogHeader>
          <CentralForm
            central={central}
            onSalvo={() => { setEditando(false); carregar() }}
            onCancelar={() => setEditando(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
