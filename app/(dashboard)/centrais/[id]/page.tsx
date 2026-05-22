"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

  if (carregando) return <p className="text-zinc-400 text-sm">Carregando...</p>
  if (!central) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/centrais")}>
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">
            {central.marca} {central.modelo}
          </h1>
          <p className="text-sm text-zinc-400">Código: {central.codigo}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
          <Pencil size={14} className="mr-1" />
          Editar
        </Button>
      </div>

      {central.descricao && (
        <p className="text-zinc-400 text-sm">{central.descricao}</p>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Wrench size={16} className="text-zinc-400" />
          <h2 className="text-lg font-semibold text-white">Base de Conhecimento</h2>
          {reparos.length > 0 && (
            <span className="text-sm text-zinc-500">
              ({reparos.length} {reparos.length === 1 ? "reparo" : "reparos"})
            </span>
          )}
        </div>

        <div className="grid gap-3">
          {reparos.map((r) => (
            <Card key={r._id} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-white">
                    OS #{r.numero_os}
                    {r.cliente_id && (
                      <span className="font-normal text-zinc-400 ml-2">
                        — {r.cliente_id.nome}
                      </span>
                    )}
                  </CardTitle>
                  {r.closed_at && (
                    <span className="text-xs text-zinc-500">
                      {new Date(r.closed_at).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2 text-sm">
                <div>
                  <span className="text-zinc-500 text-xs uppercase tracking-wide">Defeito</span>
                  <p className="text-zinc-300 mt-0.5">{r.defeito_descricao}</p>
                </div>
                {r.solucao_descricao && (
                  <div>
                    <span className="text-zinc-500 text-xs uppercase tracking-wide">Solução</span>
                    <p className="text-zinc-300 mt-0.5">{r.solucao_descricao}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {reparos.length === 0 && (
            <Card className="bg-zinc-900 border-zinc-800 border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-zinc-500 text-sm">
                  Nenhum reparo concluído registrado para este modelo ainda.
                </p>
                <p className="text-zinc-600 text-xs mt-1">
                  Reparos aparecerão aqui quando OS forem concluídas.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Editar central</DialogTitle>
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
