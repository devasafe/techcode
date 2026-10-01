"use client"

import { useState } from "react"
import { Wand2, Loader2, Pencil, Check, X, AlertTriangle } from "lucide-react"

export type MidiaAudio = {
  _id: string
  url: string
  /** Ausente nas mídias criadas antes dos dois campos existirem. */
  papel?: "peca" | "defeito"
  duracao_s?: number
  transcricao?: {
    status: "pendente" | "processando" | "concluida" | "falhou"
    texto?: string
    erro?: string
  }
}

type Props = {
  osId: string
  midias: MidiaAudio[]
  onAtualizado: () => void
}

const TITULO: Record<string, string> = {
  peca: "Qual é a peça (áudio)",
  defeito: "Defeito relatado (áudio)",
}

export function BlocoAudio({ osId, midias, onAtualizado }: Props) {
  const audios = midias.filter(Boolean)
  if (!audios.length) return null

  // Agrupa por papel para o áudio da peça não se confundir com o do defeito —
  // era exatamente essa mistura que punha o modelo da central no campo errado.
  const daPeca = audios.filter((m) => m.papel === "peca")
  const doDefeito = audios.filter((m) => m.papel !== "peca")

  return (
    <div className="space-y-4">
      {[
        ["peca", daPeca],
        ["defeito", doDefeito],
      ].map(([papel, lista]) => {
        const itens = lista as MidiaAudio[]
        if (!itens.length) return null
        return (
          <div key={papel as string} className="space-y-2">
            <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4]">
              {TITULO[papel as string]}
            </p>
            {itens.map((m) => (
              <ItemAudio key={m._id} osId={osId} midia={m} onAtualizado={onAtualizado} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function ItemAudio({
  osId,
  midia,
  onAtualizado,
}: {
  osId: string
  midia: MidiaAudio
  onAtualizado: () => void
}) {
  const [trabalhando, setTrabalhando] = useState(false)
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(midia.transcricao?.texto ?? "")
  const [erro, setErro] = useState("")

  const status = midia.transcricao?.status
  const texto = midia.transcricao?.texto

  async function transcrever() {
    setTrabalhando(true)
    setErro("")
    try {
      const res = await fetch(`/api/os/${osId}/transcrever`, { method: "POST" })
      const dados = await res.json()
      if (!res.ok) {
        setErro(dados?.error ?? "Não deu para transcrever")
        return
      }
      const meu = dados.resultados?.find(
        (r: { midia_id: string; ok: boolean; motivo?: string }) => r.midia_id === midia._id
      )
      if (meu && !meu.ok) setErro(meu.motivo ?? "Não deu para transcrever")
      onAtualizado()
    } catch {
      setErro("Sem conexão")
    } finally {
      setTrabalhando(false)
    }
  }

  async function salvarCorrecao() {
    if (!rascunho.trim()) return
    setTrabalhando(true)
    setErro("")
    try {
      const res = await fetch(`/api/os/${osId}/transcrever`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ midia_id: midia._id, texto: rascunho }),
      })
      if (!res.ok) {
        const dados = await res.json()
        setErro(dados?.error ?? "Não deu para salvar")
        return
      }
      setEditando(false)
      onAtualizado()
    } catch {
      setErro("Sem conexão")
    } finally {
      setTrabalhando(false)
    }
  }

  return (
    <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4 space-y-3">
      <audio controls src={midia.url} className="w-full" />

      {editando ? (
        <div className="space-y-2">
          <textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            rows={3}
            className="w-full bg-[#0C0C0C] border border-[#1C1C1C] text-base text-[#F0F0F0] px-3 py-2 rounded-sm focus:outline-none focus:border-[#E8FF47]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={salvarCorrecao}
              disabled={trabalhando}
              className="flex items-center gap-2 bg-[#E8FF47] text-black px-4 py-2 rounded-sm text-sm font-bold uppercase tracking-wide disabled:opacity-50"
            >
              <Check size={16} /> Salvar
            </button>
            <button
              type="button"
              onClick={() => {
                setEditando(false)
                setRascunho(texto ?? "")
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-bold text-[#B4B4B4] hover:text-white"
            >
              <X size={16} /> Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          {texto && <p className="text-base text-[#F0F0F0]">{texto}</p>}

          {status === "processando" && (
            <p className="flex items-center gap-2 text-sm text-[#B4B4B4]">
              <Loader2 size={14} className="animate-spin" /> Transcrevendo...
            </p>
          )}

          {status === "falhou" && (
            <p className="flex items-start gap-2 text-sm text-[#F59E0B]">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                Não deu para transcrever. O áudio continua aí.
                {midia.transcricao?.erro ? ` (${midia.transcricao.erro})` : ""}
              </span>
            </p>
          )}

          {erro && <p className="text-sm text-[#FF4444]">{erro}</p>}

          <div className="flex flex-wrap gap-3">
            {status !== "concluida" && status !== "processando" && (
              <button
                type="button"
                onClick={transcrever}
                disabled={trabalhando}
                className="flex items-center gap-2 text-sm font-bold text-[#E8FF47] disabled:opacity-50"
              >
                {trabalhando ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Wand2 size={16} />
                )}
                {status === "falhou" ? "Tentar de novo" : "Transcrever o áudio"}
              </button>
            )}

            {texto && (
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="flex items-center gap-2 text-sm font-bold text-[#B4B4B4] hover:text-white"
              >
                <Pencil size={16} /> Corrigir
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
