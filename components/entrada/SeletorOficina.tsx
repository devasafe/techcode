"use client"

import { useEffect, useRef, useState } from "react"
import { Search, X, Plus, Check } from "lucide-react"
import { normalizarE164, formatarBR, parecTelefone } from "@/lib/telefone"

export type ClienteResumo = {
  _id: string
  nome: string
  telefone: string
  nome_confirmado?: boolean
}

type Props = {
  selecionado: ClienteResumo | null
  onSelecionar: (c: ClienteResumo | null) => void
  /** Telefone cru digitado, quando o cliente ainda não existe. */
  onTelefoneNovo: (telefone: string | null) => void
}

export function SeletorOficina({ selecionado, onSelecionar, onTelefoneNovo }: Props) {
  const [busca, setBusca] = useState("")
  const [resultados, setResultados] = useState<ClienteResumo[]>([])
  const [recentes, setRecentes] = useState<ClienteResumo[]>([])
  const [carregando, setCarregando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Com ~30 oficinas, os 5 últimos cobrem a maior parte dos casos sem digitar nada.
  useEffect(() => {
    fetch("/api/clientes?recentes=1")
      .then((r) => (r.ok ? r.json() : []))
      .then(setRecentes)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (selecionado) return
    const q = busca.trim()
    if (q.length < 2) {
      setResultados([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setCarregando(true)
      fetch(`/api/clientes?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : []))
        .then(setResultados)
        .catch(() => {})
        .finally(() => setCarregando(false))
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [busca, selecionado])

  // O que foi digitado é um telefone que ainda não está cadastrado?
  const e164 = parecTelefone(busca) ? normalizarE164(busca) : null
  const podeCriar = Boolean(e164) && !resultados.length && !carregando

  function escolher(c: ClienteResumo) {
    onSelecionar(c)
    onTelefoneNovo(null)
    setBusca("")
    setResultados([])
  }

  function criarComTelefone() {
    if (!e164) return
    onTelefoneNovo(e164)
    onSelecionar({ _id: "", nome: formatarBR(e164), telefone: formatarBR(e164) })
    setBusca("")
  }

  if (selecionado) {
    return (
      <div className="flex items-center justify-between bg-[#111111] border border-[#E8FF47] rounded-sm px-4 py-4">
        <div className="min-w-0">
          <p className="text-base font-bold text-[#F0F0F0] truncate">{selecionado.nome}</p>
          {selecionado.nome !== selecionado.telefone && (
            <p className="text-sm text-[#B4B4B4]">{selecionado.telefone}</p>
          )}
          {!selecionado._id && (
            <p className="text-[12px] font-bold uppercase tracking-wide text-[#E8FF47] mt-1">
              cliente novo
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            onSelecionar(null)
            onTelefoneNovo(null)
          }}
          className="shrink-0 ml-3 p-2 text-[#B4B4B4] hover:text-white"
          aria-label="Trocar oficina"
        >
          <X size={20} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B4B4B4]" />
        <input
          ref={inputRef}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Nome ou telefone da oficina"
          inputMode="text"
          className="w-full bg-[#111111] border border-[#1C1C1C] text-base text-[#F0F0F0] pl-11 pr-4 py-4 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors placeholder:text-[#8A8A8A]"
        />
      </div>

      {podeCriar && (
        <button
          type="button"
          onClick={criarComTelefone}
          className="w-full flex items-center gap-3 bg-[#1A1A1A] border border-[#E8FF47] px-4 py-4 rounded-sm text-left active:bg-[#222]"
        >
          <Plus size={20} className="text-[#E8FF47] shrink-0" />
          <span className="text-base font-bold text-[#F0F0F0]">
            Criar &ldquo;{formatarBR(e164)}&rdquo;
          </span>
        </button>
      )}

      {resultados.map((c) => (
        <button
          key={c._id}
          type="button"
          onClick={() => escolher(c)}
          className="w-full flex items-center justify-between bg-[#111111] border border-[#1C1C1C] px-4 py-4 rounded-sm text-left hover:border-[#B4B4B4] active:bg-[#1A1A1A]"
        >
          <div className="min-w-0">
            <p className="text-base text-[#F0F0F0] truncate">{c.nome}</p>
            <p className="text-sm text-[#B4B4B4]">{c.telefone}</p>
          </div>
          <Check size={18} className="text-[#B4B4B4] shrink-0 ml-3" />
        </button>
      ))}

      {!busca && recentes.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] pt-2">
            Últimas oficinas
          </p>
          {recentes.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => escolher(c)}
              className="w-full flex items-center justify-between bg-[#111111] border border-[#1C1C1C] px-4 py-4 rounded-sm text-left hover:border-[#B4B4B4] active:bg-[#1A1A1A]"
            >
              <div className="min-w-0">
                <p className="text-base text-[#F0F0F0] truncate">{c.nome}</p>
                <p className="text-sm text-[#B4B4B4]">{c.telefone}</p>
              </div>
              <Check size={18} className="text-[#B4B4B4] shrink-0 ml-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
