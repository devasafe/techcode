"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { OSStatus } from "@/types"

type OSFila = {
  _id: string
  numero_os: number
  status: OSStatus
  defeito_descricao: string
  created_at: string
  cliente_id: { nome: string } | null
  central_id: { marca: string; modelo: string } | null
}

const COLUNAS: { status: OSStatus; label: string; accent: string }[] = [
  { status: "aberta",       label: "Abertas",       accent: "#888888" },
  { status: "na_fila",      label: "Na fila",       accent: "#60A5FA" },
  { status: "em_andamento", label: "Em andamento",  accent: "#F59E0B" },
]

export default function FilaPage() {
  const router = useRouter()
  const [os, setOS] = useState<OSFila[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    setCarregando(true)
    setErro("")
    fetch("/api/os?fila=true", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) { setErro("Erro ao carregar fila."); return }
        setOS(await res.json())
      })
      .catch((err) => {
        if (err instanceof Error && err.name !== "AbortError") setErro("Erro ao carregar fila.")
      })
      .finally(() => { if (!controller.signal.aborted) setCarregando(false) })
    return () => controller.abort()
  }, [])

  const porStatus = (status: OSStatus) => os.filter((o) => o.status === status)

  return (
    <div className="space-y-6">
      <h1 className="text-sm font-semibold uppercase tracking-widest text-[#F0F0F0]">
        Fila de Serviços
      </h1>

      {erro && <p className="text-xs text-[#FF4444]">{erro}</p>}

      {carregando ? (
        <p className="text-xs uppercase tracking-widest text-[#555555]">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUNAS.map((col) => {
            const lista = porStatus(col.status)
            return (
              <div key={col.status}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1C1C1C]">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: col.accent }}
                  >
                    {col.label}
                  </span>
                  <span className="font-mono text-xs text-[#555555]">{lista.length}</span>
                </div>
                <div className="space-y-2">
                  {lista.map((o) => (
                    <div
                      key={o._id}
                      className="bg-[#111111] border border-[#1C1C1C] p-3 rounded-sm cursor-pointer hover:border-[#2A2A2A] hover:bg-[#141414] transition-colors"
                      onClick={() => router.push(`/os/${o._id}`)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs text-[#E8FF47]">#{o.numero_os}</span>
                        <span className="font-mono text-[10px] text-[#555555]">
                          {new Date(o.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {o.cliente_id && (
                        <p className="text-xs font-medium text-[#F0F0F0] mb-0.5">{o.cliente_id.nome}</p>
                      )}
                      {o.central_id && (
                        <p className="text-[10px] text-[#555555]">
                          {o.central_id.marca} {o.central_id.modelo}
                        </p>
                      )}
                      <p className="text-[10px] text-[#555555] truncate mt-1">{o.defeito_descricao}</p>
                    </div>
                  ))}
                  {lista.length === 0 && (
                    <p className="text-[10px] text-[#555555] text-center py-6">Nenhuma</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
