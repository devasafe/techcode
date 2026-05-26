"use client"

import { useRef, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CentralForm } from "@/components/centrais/CentralForm"
import { Search, Plus } from "lucide-react"

type Central = {
  _id: string
  marca: string
  modelo: string
  codigo: string
  descricao?: string
}

export default function CentraisPage() {
  const router = useRouter()
  const [centrais, setCentrais] = useState<Central[]>([])
  const [busca, setBusca] = useState("")
  const [abrirForm, setAbrirForm] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function carregar(q?: string) {
    setCarregando(true)
    setErro("")
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : ""
      const res = await fetch(`/api/centrais${params}`)
      if (!res.ok) { setErro("Erro ao carregar centrais."); return }
      setCentrais(await res.json())
    } catch {
      setErro("Erro ao carregar centrais.")
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  function handleBusca(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setBusca(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => carregar(q), 300)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold uppercase tracking-widest text-[#F0F0F0]">
          Centrais
        </h1>
        <button
          onClick={() => setAbrirForm(true)}
          className="flex items-center gap-2 bg-[#E8FF47] text-black text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-sm hover:brightness-110 transition-all"
        >
          <Plus size={14} />
          Nova central
        </button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555555]" />
        <input
          value={busca}
          onChange={handleBusca}
          placeholder="Buscar por marca, modelo ou código..."
          className="w-full bg-[#111111] border border-[#1C1C1C] text-sm text-[#F0F0F0] placeholder:text-[#555555] pl-9 pr-4 py-2.5 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors"
        />
      </div>

      {erro && <p className="text-xs text-[#FF4444]">{erro}</p>}

      {carregando && !busca ? (
        <p className="text-xs uppercase tracking-widest text-[#555555]">Carregando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#111111] border-b border-[#1C1C1C]">
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555]">Marca</th>
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555]">Modelo</th>
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555]">Código</th>
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555] hidden md:table-cell">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C1C1C]">
              {centrais.map((c) => (
                <tr
                  key={c._id}
                  className="hover:bg-[#141414] transition-colors cursor-pointer"
                  onClick={() => router.push(`/centrais/${c._id}`)}
                >
                  <td className="py-3 px-4 text-sm font-medium text-[#F0F0F0]">{c.marca}</td>
                  <td className="py-3 px-4 font-mono text-sm text-[#E8FF47]">{c.modelo}</td>
                  <td className="py-3 px-4 font-mono text-sm text-[#555555]">{c.codigo}</td>
                  <td className="py-3 px-4 text-sm text-[#555555] hidden md:table-cell">{c.descricao ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {centrais.length === 0 && !carregando && (
            <p className="text-xs text-[#555555] text-center py-8">
              {busca ? "Nenhuma central encontrada." : "Nenhuma central cadastrada ainda."}
            </p>
          )}
        </div>
      )}

      <Dialog open={abrirForm} onOpenChange={setAbrirForm}>
        <DialogContent className="bg-[#111111] border-[#1C1C1C]">
          <DialogHeader>
            <DialogTitle className="text-[#F0F0F0] text-sm uppercase tracking-widest">
              Nova central
            </DialogTitle>
          </DialogHeader>
          <CentralForm
            onSalvo={() => { setAbrirForm(false); carregar(busca) }}
            onCancelar={() => setAbrirForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
