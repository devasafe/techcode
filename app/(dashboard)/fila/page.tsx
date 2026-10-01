"use client"

import { useEffect, useState } from "react"
import { FinalizarOS } from "@/components/os/FinalizarOS"
import { useRouter } from "next/navigation"
import type { OSStatus } from "@/types"

type OSFila = {
  _id: string
  numero_os: number
  status: OSStatus
  defeito_descricao?: string
  defeito_transcrito?: string
  created_at: string
  cliente_id: { nome: string } | null
  central_id: { marca?: string; modelo?: string; codigo?: string; apelido?: string } | null
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
  const [finalizando, setFinalizando] = useState<{ id: string; numero: number } | null>(null)
  const [erro, setErro] = useState("")

  async function carregar(signal?: AbortSignal) {
    setCarregando(true)
    setErro("")
    try {
      const res = await fetch("/api/os?fila=true", { signal })
      if (!res.ok) {
        setErro("Erro ao carregar fila.")
        return
      }
      setOS(await res.json())
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") setErro("Erro ao carregar fila.")
    } finally {
      if (!signal?.aborted) setCarregando(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    carregar(controller.signal)
    return () => controller.abort()
  }, [])

  const porStatus = (status: OSStatus) => os.filter((o) => o.status === status)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold uppercase tracking-wide text-[#F0F0F0]">
        Fila de Serviços
      </h1>

      {erro && <p className="text-sm text-[#FF4444]">{erro}</p>}

      {carregando ? (
        <p className="text-sm uppercase tracking-wide text-[#B4B4B4]">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUNAS.map((col) => {
            const lista = porStatus(col.status)
            return (
              <div key={col.status}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1C1C1C]">
                  <span
                    className="text-[12px] font-bold uppercase tracking-wide"
                    style={{ color: col.accent }}
                  >
                    {col.label}
                  </span>
                  <span className="font-mono text-sm text-[#B4B4B4]">{lista.length}</span>
                </div>
                <div className="space-y-2">
                  {lista.map((o) => (
                    <div
                      key={o._id}
                      className="bg-[#111111] border border-[#1C1C1C] p-3 rounded-sm cursor-pointer hover:border-[#2A2A2A] hover:bg-[#141414] transition-colors"
                      onClick={() => router.push(`/os/${o._id}`)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-sm text-[#E8FF47]">#{o.numero_os}</span>
                        <span className="font-mono text-[12px] text-[#B4B4B4]">
                          {new Date(o.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {o.cliente_id && (
                        <p className="text-sm font-medium text-[#F0F0F0] mb-0.5">{o.cliente_id.nome}</p>
                      )}
                      {o.central_id && (
                        <p className="text-[12px] text-[#B4B4B4]">
                          {o.central_id.marca || o.central_id.modelo
                            ? `${o.central_id.marca ?? ""} ${o.central_id.modelo ?? ""}`.trim()
                            : o.central_id.apelido || "Peça sem identificação"}
                        </p>
                      )}
                      <p className="text-[12px] text-[#B4B4B4] truncate mt-1">
                        {o.defeito_descricao || o.defeito_transcrito || "—"}
                      </p>
                      {/* Fechar a OS sem sair da fila: stopPropagation para o
                          clique nao navegar para o detalhe. */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setFinalizando({ id: o._id, numero: o.numero_os })
                        }}
                        className="mt-3 w-full py-2.5 rounded-sm text-[12px] font-bold uppercase tracking-wide text-[#E8FF47] border border-[#1C1C1C] hover:border-[#E8FF47] transition-colors"
                      >
                        Finalizar
                      </button>
                    </div>
                  ))}
                  {lista.length === 0 && (
                    <p className="text-[12px] text-[#B4B4B4] text-center py-6">Nenhuma</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {finalizando && (
        <FinalizarOS
          osId={finalizando.id}
          numeroOS={finalizando.numero}
          aberto
          onFechar={() => setFinalizando(null)}
          onConcluido={carregar}
        />
      )}
    </div>
  )
}
