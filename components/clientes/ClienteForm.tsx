"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ClienteData = {
  _id: string
  nome: string
  telefone: string
  email?: string
  cpf_cnpj?: string
  endereco?: string
}

type ClienteFormProps = {
  cliente?: ClienteData
  onSalvo: () => void
  onCancelar: () => void
}

export function ClienteForm({ cliente, onSalvo, onCancelar }: ClienteFormProps) {
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)
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
    }
    const res = await fetch(
      editando ? `/api/clientes/${cliente._id}` : "/api/clientes",
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
      <div className="space-y-2">
        <Label>Nome *</Label>
        <Input
          name="nome"
          required
          defaultValue={cliente?.nome}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label>Telefone *</Label>
        <Input
          name="telefone"
          required
          defaultValue={cliente?.telefone}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          name="email"
          type="email"
          defaultValue={cliente?.email}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label>CPF / CNPJ</Label>
        <Input
          name="cpf_cnpj"
          defaultValue={cliente?.cpf_cnpj}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label>Endereço</Label>
        <Input
          name="endereco"
          defaultValue={cliente?.endereco}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
      {erro && <p className="text-red-400 text-sm">{erro}</p>}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={carregando}>
          {carregando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
