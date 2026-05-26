"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
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

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  aberta:        { label: "Aberta",        cls: "bg-[#1C1C1C] text-[#888888]" },
  na_fila:       { label: "Na fila",       cls: "bg-[#1E2A3A] text-[#60A5FA]" },
  em_andamento:  { label: "Em andamento",  cls: "bg-[#2A2000] text-[#F59E0B]" },
  concluida:     { label: "Concluída",     cls: "bg-[#0D2A1A] text-[#22C55E]" },
  devolvida:     { label: "Devolvida",     cls: "bg-[#2A0D0D] text-[#FF4444]" },
  substituida:   { label: "Substituída",   cls: "bg-[#2A1500] text-[#FB923C]" },
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

  if (carregando) return <p className="text-xs uppercase tracking-widest text-[#555555]">Carregando...</p>
  if (!cliente) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/clientes")}
          className="text-[#555555] hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-sm font-semibold uppercase tracking-widest text-[#F0F0F0] flex-1">{cliente.nome}</h1>
        <button
          onClick={() => setEditando(true)}
          className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#555555] hover:text-white transition-colors"
        >
          <Pencil size={12} />
          Editar
        </button>
      </div>

      <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#555555]">Dados de contato</p>
        <div className="space-y-2">
          <div className="flex gap-4">
            <span className="text-[10px] uppercase tracking-widest text-[#555555] w-20 shrink-0">Telefone</span>
            <span className="font-mono text-sm text-[#F0F0F0]">{cliente.telefone}</span>
          </div>
          {cliente.email && (
            <div className="flex gap-4">
              <span className="text-[10px] uppercase tracking-widest text-[#555555] w-20 shrink-0">Email</span>
              <span className="text-sm text-[#F0F0F0]">{cliente.email}</span>
            </div>
          )}
          {cliente.cpf_cnpj && (
            <div className="flex gap-4">
              <span className="text-[10px] uppercase tracking-widest text-[#555555] w-20 shrink-0">CPF/CNPJ</span>
              <span className="font-mono text-sm text-[#F0F0F0]">{cliente.cpf_cnpj}</span>
            </div>
          )}
          {cliente.endereco && (
            <div className="flex gap-4">
              <span className="text-[10px] uppercase tracking-widest text-[#555555] w-20 shrink-0">Endereço</span>
              <span className="text-sm text-[#F0F0F0]">{cliente.endereco}</span>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#555555]">Histórico de OS</span>
            {os.length > 0 && (
              <span className="font-mono text-xs text-[#555555]">{os.length}</span>
            )}
          </div>
          <Link
            href={`/os/nova?cliente=${id}`}
            className="flex items-center gap-1.5 bg-[#E8FF47] text-black text-[10px] font-semibold uppercase tracking-widest px-3 py-1.5 rounded-sm hover:brightness-110 transition-all"
          >
            <Plus size={11} />
            Nova OS
          </Link>
        </div>

        <div className="space-y-2">
          {os.map((o) => {
            const badge = STATUS_BADGE[o.status] ?? STATUS_BADGE.aberta
            return (
              <Link key={o._id} href={`/os/${o._id}`}>
                <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-3 hover:border-[#2A2A2A] hover:bg-[#141414] transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-[#E8FF47]">#{o.numero_os}</span>
                        <span className={`text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      {o.central_id && (
                        <p className="text-[10px] text-[#555555]">
                          {o.central_id.marca} {o.central_id.modelo}
                        </p>
                      )}
                      <p className="text-[10px] text-[#555555] truncate mt-0.5">{o.defeito_descricao}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm text-white">
                        {o.valor_cobrado > 0 ? `R$ ${o.valor_cobrado.toFixed(2).replace(".", ",")}` : "—"}
                      </p>
                      <p className="font-mono text-[10px] text-[#555555]">
                        {new Date(o.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
          {os.length === 0 && (
            <p className="text-xs text-[#555555] text-center py-8">Nenhuma OS encontrada.</p>
          )}
        </div>
      </div>

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="bg-[#111111] border-[#1C1C1C]">
          <DialogHeader>
            <DialogTitle className="text-[#F0F0F0] text-sm uppercase tracking-widest">Editar cliente</DialogTitle>
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
