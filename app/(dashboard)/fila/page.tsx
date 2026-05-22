"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/os/StatusBadge"
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

const COLUNAS: { status: OSStatus; label: string }[] = [
  { status: "aberta", label: "Abertas" },
  { status: "na_fila", label: "Na fila" },
  { status: "em_andamento", label: "Em andamento" },
]

export default function FilaPage() {
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

  if (carregando) return <p className="text-zinc-400 text-sm py-8 text-center">Carregando...</p>

  const porStatus = (status: OSStatus) => os.filter((o) => o.status === status)

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Fila de Serviços</h1>

      {erro && <p className="text-red-400 text-sm mb-4">{erro}</p>}

      <div className="grid grid-cols-3 gap-4">
        {COLUNAS.map((col) => {
          const lista = porStatus(col.status)
          return (
            <div key={col.status}>
              <div className="flex items-center gap-2 mb-3">
                <StatusBadge status={col.status} />
                <span className="text-zinc-400 text-sm">({lista.length})</span>
              </div>
              <div className="space-y-2">
                {lista.map((o) => (
                  <Link key={o._id} href={`/os/${o._id}`}>
                    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
                      <CardContent className="py-3 px-3">
                        <p className="text-white text-sm font-medium mb-1">OS #{o.numero_os}</p>
                        {o.cliente_id && (
                          <p className="text-xs text-zinc-400">{o.cliente_id.nome}</p>
                        )}
                        {o.central_id && (
                          <p className="text-xs text-zinc-500">
                            {o.central_id.marca} {o.central_id.modelo}
                          </p>
                        )}
                        <p className="text-xs text-zinc-500 truncate mt-1">{o.defeito_descricao}</p>
                        <p className="text-xs text-zinc-600 mt-1">
                          {new Date(o.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                {lista.length === 0 && (
                  <p className="text-zinc-600 text-xs text-center py-4">Nenhuma</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
