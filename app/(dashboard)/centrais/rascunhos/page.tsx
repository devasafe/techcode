"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Loader2, PackageSearch } from "lucide-react"

type AudioRascunho = { url: string; papel: "peca" | "defeito"; texto: string | null }

type Rascunho = {
  _id: string
  apelido?: string
  marca?: string
  modelo?: string
  codigo?: string
  termos_busca?: string
  created_at: string
  os: {
    _id: string
    numero_os: number
    cliente: { nome: string } | null
    defeito: string | null
  }[]
  fotos: string[]
  audios: AudioRascunho[]
}

/**
 * A fila de peças a identificar.
 *
 * Existe porque identificar peça NÃO pode acontecer na entrada: na bancada o
 * objetivo é registrar e seguir. Aqui a identificação vira uma atividade em
 * lote, para quando o movimento parou — com a foto e o áudio do lado, que é o
 * que permite lembrar qual peça era.
 */
export default function RascunhosPage() {
  const [itens, setItens] = useState<Rascunho[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch("/api/centrais/rascunhos", { cache: "no-store" })
      if (!res.ok) {
        setErro("Erro ao carregar as peças.")
        return
      }
      setItens(await res.json())
      setErro("")
    } catch {
      setErro("Erro ao carregar as peças.")
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-wide text-[#F0F0F0]">
          Peças a identificar
        </h1>
        <p className="text-sm text-[#B4B4B4] mt-1">
          {itens.length > 0
            ? `${itens.length} ${itens.length === 1 ? "peça" : "peças"} esperando. Com a foto e o áudio do lado, dá para resolver em lote.`
            : "Nada pendente."}
        </p>
      </div>

      {erro && <p className="text-base font-bold text-[#FF4444]">{erro}</p>}

      {carregando ? (
        <p className="text-sm uppercase tracking-wide text-[#B4B4B4]">Carregando...</p>
      ) : itens.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <PackageSearch size={40} className="text-[#B4B4B4]" />
          <p className="text-base text-[#B4B4B4]">
            Toda peça que passou pela bancada já está identificada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {itens.map((r) => (
            <CardRascunho key={r._id} rascunho={r} onConfirmado={carregar} />
          ))}
        </div>
      )}
    </div>
  )
}

function CardRascunho({
  rascunho,
  onConfirmado,
}: {
  rascunho: Rascunho
  onConfirmado: () => void
}) {
  const [marca, setMarca] = useState(rascunho.marca ?? "")
  const [modelo, setModelo] = useState(rascunho.modelo ?? "")
  const [codigo, setCodigo] = useState(rascunho.codigo ?? "")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  const audioPeca = rascunho.audios.find((a) => a.papel === "peca")
  const audioDefeito = rascunho.audios.find((a) => a.papel === "defeito")
  const podeConfirmar = marca.trim() || modelo.trim() || codigo.trim()

  async function confirmar() {
    if (!podeConfirmar) return
    setSalvando(true)
    setErro("")
    try {
      const res = await fetch(`/api/centrais/${rascunho._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmar: true,
          marca: marca.trim() || undefined,
          modelo: modelo.trim() || undefined,
          codigo: codigo.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setErro(d?.error ?? "Não deu para salvar")
        return
      }
      onConfirmado()
    } catch {
      setErro("Sem conexão")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-[#F0F0F0] truncate">
            {rascunho.apelido || "Peça sem nome"}
          </p>
          <p className="text-sm text-[#B4B4B4]">
            {rascunho.os.length > 0
              ? rascunho.os
                  .map((o) => `OS #${o.numero_os}${o.cliente ? ` · ${o.cliente.nome}` : ""}`)
                  .join(" · ")
              : "Sem OS"}
          </p>
        </div>
        <span className="shrink-0 font-mono text-[12px] text-[#B4B4B4]">
          {new Date(rascunho.created_at).toLocaleDateString("pt-BR")}
        </span>
      </div>

      {rascunho.fotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {rascunho.fotos.slice(0, 6).map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square bg-[#0C0C0C] rounded-sm overflow-hidden border border-[#1C1C1C] block hover:border-[#E8FF47] transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Foto da peça" className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      )}

      {audioPeca && (
        <div className="space-y-1">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4]">
            O que foi dito da peça
          </p>
          {audioPeca.texto && <p className="text-base text-[#F0F0F0]">{audioPeca.texto}</p>}
          <audio controls src={audioPeca.url} className="w-full" />
        </div>
      )}

      {audioDefeito?.texto && (
        <div className="space-y-1">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4]">
            Defeito
          </p>
          <p className="text-sm text-[#B4B4B4]">{audioDefeito.texto}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <input
          value={marca}
          onChange={(e) => setMarca(e.target.value)}
          placeholder="Marca"
          className="bg-[#0C0C0C] border border-[#1C1C1C] text-base text-[#F0F0F0] px-3 py-3 rounded-sm focus:outline-none focus:border-[#E8FF47] placeholder:text-[#8A8A8A]"
        />
        <input
          value={modelo}
          onChange={(e) => setModelo(e.target.value)}
          placeholder="Modelo"
          className="bg-[#0C0C0C] border border-[#1C1C1C] text-base text-[#F0F0F0] px-3 py-3 rounded-sm focus:outline-none focus:border-[#E8FF47] placeholder:text-[#8A8A8A]"
        />
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Código"
          className="bg-[#0C0C0C] border border-[#1C1C1C] text-base font-mono text-[#F0F0F0] px-3 py-3 rounded-sm focus:outline-none focus:border-[#E8FF47] placeholder:text-[#8A8A8A]"
        />
      </div>

      {erro && <p className="text-sm font-bold text-[#FF4444]">{erro}</p>}

      <button
        type="button"
        onClick={confirmar}
        disabled={!podeConfirmar || salvando}
        className="w-full flex items-center justify-center gap-2 bg-[#E8FF47] text-black py-4 rounded-sm text-base font-bold uppercase tracking-wide disabled:opacity-40 active:brightness-90"
      >
        {salvando ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
        Identificada
      </button>
    </div>
  )
}
