"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ClienteForm } from "@/components/clientes/ClienteForm"
import { Search, UserPlus, ChevronRight } from "lucide-react"

type Cliente = {
  _id: string
  nome: string
  telefone: string
  email?: string
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
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
      const res = await fetch(`/api/clientes${params}`)
      if (!res.ok) { setErro("Erro ao carregar clientes."); return }
      setClientes(await res.json())
    } catch {
      setErro("Erro ao carregar clientes.")
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
        <h1 className="text-2xl font-bold text-white">Clientes</h1>
        <Button onClick={() => setAbrirForm(true)}>
          <UserPlus size={16} className="mr-2" />
          Novo cliente
        </Button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-3 text-zinc-500" />
        <Input
          value={busca}
          onChange={handleBusca}
          placeholder="Buscar por nome ou telefone..."
          className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
        />
      </div>

      <div className="grid gap-3">
        {erro && <p className="text-red-400 text-sm text-center py-4">{erro}</p>}
        {clientes.map((c) => (
          <Link key={c._id} href={`/clientes/${c._id}`}>
            <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-white">{c.nome}</p>
                  <p className="text-sm text-zinc-400">{c.telefone}</p>
                  {c.email && <p className="text-sm text-zinc-500">{c.email}</p>}
                </div>
                <ChevronRight size={16} className="text-zinc-500" />
              </CardContent>
            </Card>
          </Link>
        ))}
        {clientes.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-8">
            {busca ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
          </p>
        )}
      </div>

      <Dialog open={abrirForm} onOpenChange={setAbrirForm}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Novo cliente</DialogTitle>
          </DialogHeader>
          <ClienteForm
            onSalvo={() => { setAbrirForm(false); carregar(busca) }}
            onCancelar={() => setAbrirForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
