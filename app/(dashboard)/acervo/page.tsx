"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Archive, PackageSearch, ChevronRight, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CentralForm } from "@/components/centrais/CentralForm"

type ItemAcervo = {
  _id: string
  apelido?: string
  marca?: string
  modelo?: string
  codigo?: string
  termos_busca?: string
  status_catalogo?: "rascunho" | "confirmada"
  midias?: { tipo: string; url: string }[]
  created_at?: string
}

/**
 * O acervo das peças que já passaram pela bancada.
 *
 * A busca varre apelido, marca, modelo, código e `termos_busca` — que é onde as
 * transcrições de áudio entram. Então procurar "Peugeot capacitor" acha a peça
 * mesmo que ninguém tenha digitado isso em campo nenhum: o texto veio do que
 * foi falado na entrada.
 */
export default function AcervoPage() {
  const router = useRouter()
  const [busca, setBusca] = useState("")
  const [itens, setItens] = useState<ItemAcervo[]>([])
  const [incluirRascunhos, setIncluirRascunhos] = useState(true)
  const [carregando, setCarregando] = useState(true)
  const [aIdentificar, setAIdentificar] = useState(0)
  const [abrirForm, setAbrirForm] = useState(false)
  // Muda para forçar a busca a rodar de novo quando uma peça é cadastrada.
  const [recarregar, setRecarregar] = useState(0)

  // O acesso à fila de identificação fica aqui, onde a pessoa já está olhando
  // o acervo — em vez de ocupar mais um lugar no menu.
  useEffect(() => {
    fetch("/api/centrais/rascunhos?contar=1")
      .then((r) => (r.ok ? r.json() : { total: 0 }))
      .then((d) => setAIdentificar(d.total ?? 0))
      .catch(() => {})
  }, [itens])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setCarregando(true)
      const params = new URLSearchParams()
      if (busca.trim()) params.set("q", busca.trim())
      if (incluirRascunhos) params.set("rascunhos", "1")
      fetch(`/api/centrais/acervo?${params}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : []))
        .then(setItens)
        .catch(() => {})
        .finally(() => {
          if (!controller.signal.aborted) setCarregando(false)
        })
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [busca, incluirRascunhos, recarregar])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wide text-[#F0F0F0]">Acervo</h1>
          <p className="text-sm text-[#B4B4B4] mt-1">
            Tudo que já passou pela bancada. A busca inclui o que foi falado nos áudios.
          </p>
        </div>
        <button
          onClick={() => setAbrirForm(true)}
          className="shrink-0 flex items-center gap-2 bg-[#E8FF47] text-black text-sm font-bold uppercase tracking-wide px-4 py-3 rounded-sm hover:brightness-110 transition-all"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nova peça</span>
        </button>
      </div>

      {aIdentificar > 0 && (
        <button
          type="button"
          onClick={() => router.push("/centrais/rascunhos")}
          className="w-full flex items-center gap-3 bg-[#2A1800] border border-[#F59E0B]/40 px-4 py-4 rounded-sm text-left hover:border-[#F59E0B] transition-colors"
        >
          <PackageSearch size={20} className="text-[#F59E0B] shrink-0" />
          <span className="flex-1 text-base font-bold text-[#F59E0B]">
            {aIdentificar} {aIdentificar === 1 ? "peça" : "peças"} a identificar
          </span>
          <ChevronRight size={20} className="text-[#F59E0B] shrink-0" />
        </button>
      )}

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B4B4B4]" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="ex: Peugeot, capacitor, 4GV, painel Gol"
          className="w-full bg-[#111111] border border-[#1C1C1C] text-base text-[#F0F0F0] pl-11 pr-11 py-4 rounded-sm focus:outline-none focus:border-[#E8FF47] placeholder:text-[#8A8A8A]"
        />
        {busca && (
          <button
            type="button"
            onClick={() => setBusca("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#B4B4B4] hover:text-white"
            aria-label="Limpar busca"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={incluirRascunhos}
          onChange={(e) => setIncluirRascunhos(e.target.checked)}
          className="h-4 w-4 accent-[#E8FF47]"
        />
        <span className="text-sm text-[#B4B4B4]">incluir peças ainda não identificadas</span>
      </label>

      {carregando ? (
        <p className="text-sm uppercase tracking-wide text-[#B4B4B4]">Buscando...</p>
      ) : itens.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Archive size={40} className="text-[#B4B4B4]" />
          <p className="text-base text-[#B4B4B4]">
            {busca ? "Nada encontrado para essa busca." : "O acervo começa a se formar com o uso."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4]">
            {itens.length} {itens.length === 1 ? "peça" : "peças"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {itens.map((c) => {
              const foto = c.midias?.find((m) => m.tipo === "foto")?.url
              const titulo =
                c.marca || c.modelo
                  ? `${c.marca ?? ""} ${c.modelo ?? ""}`.trim()
                  : c.apelido || "Peça sem identificação"
              return (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => router.push(`/centrais/${c._id}`)}
                  className="bg-[#111111] border border-[#1C1C1C] rounded-sm overflow-hidden text-left hover:border-[#E8FF47] transition-colors"
                >
                  {foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={foto} alt={titulo} className="w-full h-32 object-cover" />
                  ) : (
                    <div className="w-full h-32 bg-[#0C0C0C] flex items-center justify-center">
                      <Archive size={24} className="text-[#1C1C1C]" />
                    </div>
                  )}
                  <div className="p-3 space-y-1">
                    <p className="text-base font-medium text-[#F0F0F0] truncate">{titulo}</p>
                    {c.codigo && (
                      <p className="font-mono text-[12px] text-[#E8FF47]">{c.codigo}</p>
                    )}
                    {c.termos_busca && (
                      <p className="text-sm text-[#B4B4B4] line-clamp-2">{c.termos_busca}</p>
                    )}
                    {c.status_catalogo === "rascunho" && (
                      <p className="text-[12px] font-bold uppercase tracking-wide text-[#F59E0B]">
                        a identificar
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      <Dialog open={abrirForm} onOpenChange={setAbrirForm}>
        <DialogContent className="bg-[#111111] border-[#1C1C1C]">
          <DialogHeader>
            <DialogTitle className="text-[#F0F0F0] text-base uppercase tracking-wide">
              Nova peça
            </DialogTitle>
          </DialogHeader>
          <CentralForm
            onSalvo={() => {
              setAbrirForm(false)
              setRecarregar((n) => n + 1)
            }}
            onCancelar={() => setAbrirForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
