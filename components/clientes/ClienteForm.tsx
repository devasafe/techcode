"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

type ClienteData = {
  _id: string
  nome: string
  telefone: string
  email?: string
  cpf_cnpj?: string
  endereco?: string
  tipo_cliente?: "mecanico" | "usuario"
}

type ClienteFormProps = {
  cliente?: ClienteData
  onSalvo: () => void
  onCancelar: () => void
}

const inputCls = "w-full bg-[#0C0C0C] border border-[#1C1C1C] text-sm text-[#F0F0F0] px-3 py-2 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors placeholder:text-[#333333]"
const labelCls = "block text-[10px] font-semibold uppercase tracking-widest text-[#555555] mb-1"

export function ClienteForm({ cliente, onSalvo, onCancelar }: ClienteFormProps) {
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [tipoCliente, setTipoCliente] = useState<"mecanico" | "usuario" | "">(cliente?.tipo_cliente ?? "")
  const editando = !!cliente

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro("")
    setCarregando(true)
    const form = new FormData(e.currentTarget)
    const body = {
      nome: form.get("nome") as string,
      telefone: form.get("telefone") as string,
      email: (form.get("email") as string) || undefined,
      cpf_cnpj: (form.get("cpf_cnpj") as string) || undefined,
      endereco: (form.get("endereco") as string) || undefined,
      ...(tipoCliente && { tipo_cliente: tipoCliente }),
    }
    const res = await fetch(
      editando ? `/api/clientes/${cliente._id}` : "/api/clientes",
      { method: editando ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    )
    setCarregando(false)
    if (!res.ok) {
      const data = await res.json()
      setErro(data.error ?? "Erro ao salvar.")
      return
    }
    onSalvo()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Nome *</label>
        <input name="nome" required defaultValue={cliente?.nome} className={inputCls} placeholder="Nome completo" />
      </div>
      <div>
        <label className={labelCls}>Telefone *</label>
        <input name="telefone" required defaultValue={cliente?.telefone} className={inputCls} placeholder="(00) 00000-0000" />
      </div>

      <div>
        <label className={labelCls}>Tipo de cliente</label>
        <div className="flex gap-2">
          {(["usuario", "mecanico"] as const).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setTipoCliente(tipoCliente === tipo ? "" : tipo)}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold uppercase tracking-widest border transition-colors ${
                tipoCliente === tipo
                  ? "bg-[#E8FF47] text-black border-[#E8FF47]"
                  : "bg-transparent text-[#555555] border-[#1C1C1C] hover:border-[#555555]"
              }`}
            >
              {tipo === "usuario" ? "Usuário" : "Mecânico"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Email</label>
        <input name="email" type="email" defaultValue={cliente?.email} className={inputCls} placeholder="email@exemplo.com" />
      </div>
      <div>
        <label className={labelCls}>CPF / CNPJ</label>
        <input name="cpf_cnpj" defaultValue={cliente?.cpf_cnpj} className={inputCls} placeholder="000.000.000-00" />
      </div>
      <div>
        <label className={labelCls}>Endereço</label>
        <input name="endereco" defaultValue={cliente?.endereco} className={inputCls} placeholder="Rua, número, cidade..." />
      </div>

      {erro && <p className="text-xs text-red-400">{erro}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={carregando}
          className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest bg-[#E8FF47] text-black rounded-sm hover:bg-[#d4eb3a] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {carregando && <Loader2 size={12} className="animate-spin" />}
          {carregando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={carregando}
          className="px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#555555] hover:text-white border border-[#1C1C1C] rounded-sm transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
