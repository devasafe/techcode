"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CentralData = {
  _id: string
  marca: string
  modelo: string
  codigo: string
  descricao?: string
}

type CentralFormProps = {
  central?: CentralData
  onSalvo: () => void
  onCancelar: () => void
}

export function CentralForm({ central, onSalvo, onCancelar }: CentralFormProps) {
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)
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
      <div className="space-y-2">
        <Label>Marca *</Label>
        <Input
          name="marca"
          required
          placeholder="ex: Bosch"
          defaultValue={central?.marca}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label>Modelo *</Label>
        <Input
          name="modelo"
          required
          placeholder="ex: ME17.9.53"
          defaultValue={central?.modelo}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label>Código *</Label>
        <Input
          name="codigo"
          required
          placeholder="ex: 4CFR"
          defaultValue={central?.codigo}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Input
          name="descricao"
          placeholder="ex: Motor 1.0 Flex"
          defaultValue={central?.descricao}
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
