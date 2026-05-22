"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ClienteForm } from "@/components/clientes/ClienteForm"
import { ArrowLeft, Pencil, Plus } from "lucide-react"

type Cliente = {
  _id: string
  nome: string
  telefone: string
  email?: string
  cpf_cnpj?: string
  endereco?: string
}

type OSResumo = {
  _id: string
  numero_os: number
  status: string
  defeito_descricao: string
  valor_cobrado: number
  created_at: string
  central_id: { marca: string; modelo: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  aberta: "Aberta",
  na_fila: "Na fila",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  devolvida: "Devolvida",
  substituida: "Substituída",
}

const STATUS_COLOR: Record<string, string> = {
  aberta: "bg-zinc-700 text-zinc-300",
  na_fila: "bg-amber-900/40 text-amber-400",
  em_andamento: "bg-violet-900/40 text-violet-400",
  concluida: "bg-green-900/40 text-green-400",
  devolvida: "bg-red-900/40 text-red-400",
  substituida: "bg-orange-900/40 text-orange-400",
}

export default function ClientePerfilPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [os, setOS] = useState<OSResumo[]>([])
  const [editando, setEditando] = useState(false)
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    setCarregando(true)
    try {
      const [resCliente, resOS] = await Promise.all([
        fetch(`/api/clientes/${id}`),
        fetch(`/api/clientes/${id}/os`),
      ])
      if (!resCliente.ok) { router.push("/clientes"); return }
      const [dadosCliente, dadosOS] = await Promise.all([
        resCliente.json(),
        resOS.ok ? resOS.json() : [],
      ])
      setCliente(dadosCliente)
      setOS(dadosOS)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [id])

  if (carregando) return <p className="text-zinc-400 text-sm">Carregando...</p>
  if (!cliente) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/clientes")}>
          <ArrowLeft size={16} />
        </Button>
        <h1 className="text-2xl font-bold text-white flex-1">{cliente.nome}</h1>
        <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
          <Pencil size={14} className="mr-1" />
          Editar
        </Button>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-400 font-normal">Dados de contato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-zinc-500 w-24">Telefone</span>
            <span className="text-white">{cliente.telefone}</span>
          </div>
          {cliente.email && (
            <div className="flex gap-2">
              <span className="text-zinc-500 w-24">Email</span>
              <span className="text-white">{cliente.email}</span>
            </div>
          )}
          {cliente.cpf_cnpj && (
            <div className="flex gap-2">
              <span className="text-zinc-500 w-24">CPF/CNPJ</span>
              <span className="text-white">{cliente.cpf_cnpj}</span>
            </div>
          )}
          {cliente.endereco && (
            <div className="flex gap-2">
              <span className="text-zinc-500 w-24">Endereço</span>
              <span className="text-white">{cliente.endereco}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">
            Histórico de OS
            {os.length > 0 && (
              <span className="ml-2 text-sm text-zinc-500 font-normal">({os.length})</span>
            )}
          </h2>
          <Button size="sm" disabled>
            <Plus size={14} className="mr-1" />
            Nova OS
          </Button>
        </div>

        <div className="grid gap-3">
          {os.map((o) => (
            <Link key={o._id} href={`/os/${o._id}`}>
              <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium text-sm">OS #{o.numero_os}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[o.status] ?? "bg-zinc-700 text-zinc-300"}`}
                        >
                          {STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </div>
                      {o.central_id && (
                        <p className="text-xs text-zinc-500">
                          {o.central_id.marca} {o.central_id.modelo}
                        </p>
                      )}
                      <p className="text-xs text-zinc-400 truncate mt-1">{o.defeito_descricao}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-white">
                        R$ {o.valor_cobrado.toFixed(2).replace(".", ",")}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(o.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {os.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-6">Nenhuma OS encontrada.</p>
          )}
        </div>
      </div>

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Editar cliente</DialogTitle>
          </DialogHeader>
          <ClienteForm
            cliente={cliente}
            onSalvo={() => { setEditando(false); carregar() }}
            onCancelar={() => setEditando(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
