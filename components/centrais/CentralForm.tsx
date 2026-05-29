"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

type TipoModulo = "central" | "abs" | "painel" | "body_computer" | "airbag" | "outro"

const TIPOS: { value: TipoModulo; label: string }[] = [
  { value: "central",       label: "Central" },
  { value: "abs",           label: "ABS" },
  { value: "painel",        label: "Painel" },
  { value: "body_computer", label: "Body Computer" },
  { value: "airbag",        label: "Airbag" },
  { value: "outro",         label: "Outro" },
]

type CentralData = {
  _id: string
  marca: string
  modelo: string
  codigo: string
  tipo_modulo?: TipoModulo
  descricao?: string
}

type CentralFormProps = {
  central?: CentralData
  onSalvo: () => void
  onCancelar: () => void
}

const inputCls = "w-full bg-[#0C0C0C] border border-[#1C1C1C] text-sm text-[#F0F0F0] px-3 py-2 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors placeholder:text-[#333333]"
const labelCls = "block text-[10px] font-semibold uppercase tracking-widest text-[#555555] mb-1"

export function CentralForm({ central, onSalvo, onCancelar }: CentralFormProps) {
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [tipoModulo, setTipoModulo] = useState<TipoModulo | "">(central?.tipo_modulo ?? "")
  const editando = !!central

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro("")
    setCarregando(true)
    const form = new FormData(e.currentTarget)
    const body = {
      marca: form.get("marca") as string,
      modelo: form.get("modelo") as string,
      codigo: form.get("codigo") as string,
      ...(tipoModulo && { tipo_modulo: tipoModulo }),
      descricao: (form.get("descricao") as string) || undefined,
    }
    const res = await fetch(
      editando ? `/api/centrais/${central._id}` : "/api/centrais",
      {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
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
        <label className={labelCls}>Tipo de módulo</label>
        <div className="flex flex-wrap gap-2">
          {TIPOS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTipoModulo(tipoModulo === t.value ? "" : t.value)}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold uppercase tracking-widest border transition-colors ${
                tipoModulo === t.value
                  ? "bg-[#E8FF47] text-black border-[#E8FF47]"
                  : "bg-transparent text-[#555555] border-[#1C1C1C] hover:border-[#555555]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Marca *</label>
        <input
          name="marca"
          required
          placeholder="ex: Bosch"
          defaultValue={central?.marca}
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Modelo *</label>
        <input
          name="modelo"
          required
          placeholder="ex: ME17.9.53"
          defaultValue={central?.modelo}
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Código *</label>
        <input
          name="codigo"
          required
          placeholder="ex: 4CFR"
          defaultValue={central?.codigo}
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Descrição</label>
        <input
          name="descricao"
          placeholder="ex: Motor 1.0 Flex"
          defaultValue={central?.descricao}
          className={inputCls}
        />
      </div>

      {erro && <p className="text-xs text-[#FF4444]">{erro}</p>}

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
