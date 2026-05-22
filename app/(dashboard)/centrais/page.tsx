"use client"

import { useRef, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CentralForm } from "@/components/centrais/CentralForm"
import { Search, Plus, ChevronRight, Cpu } from "lucide-react"

type Central = {
  _id: string
  marca: string
  modelo: string
  codigo: string
  descricao?: string
}

export default function CentraisPage() {
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

  if (carregando && !busca) return <p className="text-zinc-400 text-sm py-8 text-center">Carregando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Centrais</h1>
        <Button onClick={() => setAbrirForm(true)}>
          <Plus size={16} className="mr-2" />
          Nova central
        </Button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-3 text-zinc-500" />
        <Input
          value={busca}
          onChange={handleBusca}
          placeholder="Buscar por marca, modelo ou código..."
          className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
        />
      </div>

      <div className="grid gap-3">
        {erro && <p className="text-red-400 text-sm text-center py-4">{erro}</p>}
        {centrais.map((c) => (
          <Link key={c._id} href={`/centrais/${c._id}`}>
            <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Cpu size={18} className="text-zinc-500 shrink-0" />
                  <div>
                    <p className="font-medium text-white">
                      {c.marca} {c.modelo}
                    </p>
                    <p className="text-sm text-zinc-400">Código: {c.codigo}</p>
                    {c.descricao && (
                      <p className="text-sm text-zinc-500">{c.descricao}</p>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-500" />
              </CardContent>
            </Card>
          </Link>
        ))}
        {centrais.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-8">
            {busca ? "Nenhuma central encontrada." : "Nenhuma central cadastrada ainda."}
          </p>
        )}
      </div>

      <Dialog open={abrirForm} onOpenChange={setAbrirForm}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Nova central</DialogTitle>
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
