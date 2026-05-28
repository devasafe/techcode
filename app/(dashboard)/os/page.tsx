"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, X } from "lucide-react"
import type { OSStatus } from "@/types"

type OSResumo = {
  _id: string
  numero_os: number
  status: OSStatus
  defeito_descricao: string
  valor_cobrado: number
  created_at: string
  cliente_id: { nome: string; telefone: string } | null
  central_id: { marca: string; modelo: string; codigo: string } | null
}

const STATUS_TABS: { value: OSStatus | ""; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "aberta", label: "Abertas" },
  { value: "na_fila", label: "Na fila" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluídas" },
  { value: "devolvida", label: "Devolvidas" },
  { value: "cancelada", label: "Canceladas" },
]

const STATUS_BADGE: Record<OSStatus, { label: string; cls: string }> = {
  aberta:        { label: "Aberta",        cls: "bg-[#1C1C1C] text-[#888888]" },
  na_fila:       { label: "Na fila",       cls: "bg-[#1E2A3A] text-[#60A5FA]" },
  em_andamento:  { label: "Em andamento",  cls: "bg-[#2A2000] text-[#F59E0B]" },
  concluida:     { label: "Concluída",     cls: "bg-[#0D2A1A] text-[#22C55E]" },
  devolvida:     { label: "Devolvida",     cls: "bg-[#2A0D0D] text-[#FF4444]" },
  substituida:   { label: "Substituída",   cls: "bg-[#2A1500] text-[#FB923C]" },
  cancelada:     { label: "Cancelada",     cls: "bg-[#1A1A1A] text-[#555555]" },
}

export default function OSPage() {
  const router = useRouter()
  const [os, setOS] = useState<OSResumo[]>([])
  const [status, setStatus] = useState<OSStatus | "">("")
  const [busca, setBusca] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    setCarregando(true)
    setErro("")
    const params = status ? `?status=${status}` : ""
    fetch(`/api/os${params}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) { setErro("Erro ao carregar OS."); return }
        setOS(await res.json())
      })
      .catch((err) => {
        if (err instanceof Error && err.name !== "AbortError") setErro("Erro ao carregar OS.")
      })
      .finally(() => { if (!controller.signal.aborted) setCarregando(false) })
    return () => controller.abort()
  }, [status])

  const q = busca.toLowerCase().trim()
  const osFiltradas = q
    ? os.filter((o) =>
        String(o.numero_os).includes(q) ||
        (o.cliente_id?.nome ?? "").toLowerCase().includes(q) ||
        (o.central_id ? `${o.central_id.marca} ${o.central_id.modelo} ${o.central_id.codigo}`.toLowerCase() : "").includes(q) ||
        o.defeito_descricao.toLowerCase().includes(q)
      )
    : os

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold uppercase tracking-widest text-[#F0F0F0]">
          Ordens de Serviço
        </h1>
        <button
          onClick={() => router.push("/os/nova")}
          className="flex items-center gap-2 bg-[#E8FF47] text-black text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-sm hover:brightness-110 transition-all"
        >
          <Plus size={14} />
          Nova OS
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555555]" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nº, cliente, central ou defeito..."
          className="w-full bg-[#111111] border border-[#1C1C1C] text-sm text-[#F0F0F0] pl-8 pr-8 py-2 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors placeholder:text-[#333333]"
        />
        {busca && (
          <button onClick={() => setBusca("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555] hover:text-white">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Filtro por status */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-widest whitespace-nowrap transition-colors rounded-sm ${
              status === tab.value
                ? "text-[#E8FF47] border-b border-[#E8FF47]"
                : "text-[#555555] hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {erro && <p className="text-xs text-[#FF4444]">{erro}</p>}

      {carregando && os.length === 0 ? (
        <p className="text-xs uppercase tracking-widest text-[#555555]">Carregando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#111111] border-b border-[#1C1C1C]">
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555]">#</th>
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555]">Cliente</th>
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555] hidden md:table-cell">Central</th>
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555]">Status</th>
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555] text-right hidden sm:table-cell">Valor</th>
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555] text-right hidden lg:table-cell">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C1C1C]">
              {osFiltradas.map((o) => {
                const badge = STATUS_BADGE[o.status] ?? STATUS_BADGE.aberta
                return (
                  <tr
                    key={o._id}
                    className="hover:bg-[#141414] transition-colors cursor-pointer"
                    onClick={() => router.push(`/os/${o._id}`)}
                  >
                    <td className="py-3 px-4 font-mono text-sm text-[#E8FF47]">
                      #{o.numero_os}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-[#F0F0F0]">{o.cliente_id?.nome ?? "—"}</p>
                      <p className="text-xs text-[#555555] truncate max-w-[180px]">{o.defeito_descricao}</p>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#555555] hidden md:table-cell">
                      {o.central_id ? `${o.central_id.marca} ${o.central_id.modelo}` : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-sm ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-sm text-right text-white hidden sm:table-cell">
                      {o.valor_cobrado > 0
                        ? `R$ ${o.valor_cobrado.toFixed(2).replace(".", ",")}`
                        : "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-sm text-right text-[#555555] hidden lg:table-cell">
                      {new Date(o.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!carregando && osFiltradas.length === 0 && (
            <p className="text-xs text-[#555555] text-center py-8">
              {busca ? "Nenhuma OS encontrada para essa busca." : status ? "Nenhuma OS com este status." : "Nenhuma OS cadastrada ainda."}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
