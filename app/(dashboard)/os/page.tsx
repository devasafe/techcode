"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/os/StatusBadge"
import { Plus, ChevronRight } from "lucide-react"
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
]

export default function OSPage() {
  const router = useRouter()
  const [os, setOS] = useState<OSResumo[]>([])
  const [status, setStatus] = useState<OSStatus | "">("")
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

  if (carregando && os.length === 0) {
    return <p className="text-zinc-400 text-sm py-8 text-center">Carregando...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Ordens de Serviço</h1>
        <Button onClick={() => router.push("/os/nova")}>
          <Plus size={16} className="mr-2" />
          Nova OS
        </Button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              status === tab.value
                ? "bg-white text-zinc-900 font-medium"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {erro && <p className="text-red-400 text-sm text-center py-4">{erro}</p>}

      <div className="grid gap-3">
        {os.map((o) => (
          <Link key={o._id} href={`/os/${o._id}`}>
            <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium text-sm">OS #{o.numero_os}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    {o.cliente_id && (
                      <p className="text-sm text-zinc-300">{o.cliente_id.nome}</p>
                    )}
                    {o.central_id && (
                      <p className="text-xs text-zinc-500">
                        {o.central_id.marca} {o.central_id.modelo}
                      </p>
                    )}
                    <p className="text-xs text-zinc-400 truncate mt-1">{o.defeito_descricao}</p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    {o.valor_cobrado > 0 && (
                      <p className="text-sm text-white">
                        R$ {o.valor_cobrado.toFixed(2).replace(".", ",")}
                      </p>
                    )}
                    <p className="text-xs text-zinc-500">
                      {new Date(o.created_at).toLocaleDateString("pt-BR")}
                    </p>
                    <ChevronRight size={14} className="text-zinc-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {!carregando && os.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-8">
            {status ? "Nenhuma OS com este status." : "Nenhuma OS cadastrada ainda."}
          </p>
        )}
      </div>
    </div>
  )
}
