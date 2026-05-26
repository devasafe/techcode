"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { UsuarioForm } from "@/components/equipe/UsuarioForm"
import { UserPlus } from "lucide-react"

type Usuario = {
  _id: string
  nome: string
  email: string
  perfis: string[]
  comissao_pct: number
  ativo: boolean
}

const PERFIL_STYLE: Record<string, string> = {
  admin:     "bg-[#2A1500] text-[#FB923C]",
  tecnico:   "bg-[#0D2A1A] text-[#22C55E]",
  atendente: "bg-[#1E2A3A] text-[#60A5FA]",
}

export default function EquipePage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [abrirForm, setAbrirForm] = useState(false)

  async function carregar() {
    const res = await fetch("/api/usuarios")
    if (!res.ok) return
    setUsuarios(await res.json())
  }

  useEffect(() => { carregar() }, [])

  async function desativar(id: string) {
    await fetch(`/api/usuarios/${id}`, { method: "DELETE" })
    carregar()
  }

  async function reativar(id: string) {
    await fetch(`/api/usuarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: true }),
    })
    carregar()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold uppercase tracking-widest text-[#F0F0F0]">
          Equipe
        </h1>
        <button
          onClick={() => setAbrirForm(true)}
          className="flex items-center gap-2 bg-[#E8FF47] text-black text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-sm hover:brightness-110 transition-all"
        >
          <UserPlus size={14} />
          Novo usuário
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#111111] border-b border-[#1C1C1C]">
              <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555]">Nome</th>
              <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555] hidden md:table-cell">Email</th>
              <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555]">Perfis</th>
              <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555] hidden sm:table-cell">Comissão</th>
              <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555]">Status</th>
              <th className="py-2 px-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1C1C1C]">
            {usuarios.map((u) => (
              <tr key={u._id} className={`transition-colors ${u.ativo ? "hover:bg-[#141414]" : "opacity-40"}`}>
                <td className="py-3 px-4 text-sm font-medium text-[#F0F0F0]">{u.nome}</td>
                <td className="py-3 px-4 text-sm text-[#555555] hidden md:table-cell">{u.email}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-1 flex-wrap">
                    {u.perfis.map((p) => (
                      <span
                        key={p}
                        className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-sm ${PERFIL_STYLE[p] ?? "bg-[#1C1C1C] text-[#888888]"}`}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4 font-mono text-sm text-[#555555] hidden sm:table-cell">
                  {u.perfis.includes("tecnico") ? `${u.comissao_pct}%` : "—"}
                </td>
                <td className="py-3 px-4">
                  <span className={`text-[10px] font-semibold uppercase tracking-widest ${u.ativo ? "text-[#22C55E]" : "text-[#555555]"}`}>
                    {u.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  {u.ativo ? (
                    <button
                      onClick={() => desativar(u._id)}
                      className="text-[10px] font-semibold uppercase tracking-widest text-[#555555] hover:text-[#FF4444] transition-colors"
                    >
                      Desativar
                    </button>
                  ) : (
                    <button
                      onClick={() => reativar(u._id)}
                      className="text-[10px] font-semibold uppercase tracking-widest text-[#555555] hover:text-[#22C55E] transition-colors"
                    >
                      Reativar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {usuarios.length === 0 && (
          <p className="text-xs text-[#555555] text-center py-8">Nenhum usuário cadastrado.</p>
        )}
      </div>

      <Dialog open={abrirForm} onOpenChange={setAbrirForm}>
        <DialogContent className="bg-[#111111] border-[#1C1C1C]">
          <DialogHeader>
            <DialogTitle className="text-[#F0F0F0] text-sm uppercase tracking-widest">
              Novo usuário
            </DialogTitle>
          </DialogHeader>
          <UsuarioForm
            onSalvo={() => { setAbrirForm(false); carregar() }}
            onCancelar={() => setAbrirForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
