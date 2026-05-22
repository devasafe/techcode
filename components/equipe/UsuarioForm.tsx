"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

type Perfil = "admin" | "atendente" | "tecnico"

type UsuarioFormProps = {
  onSalvo: () => void
  onCancelar: () => void
}

export function UsuarioForm({ onSalvo, onCancelar }: UsuarioFormProps) {
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)

  function togglePerfil(p: Perfil) {
    setPerfis((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro("")
    if (perfis.length === 0) {
      setErro("Selecione ao menos um perfil.")
      return
    }
    setCarregando(true)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: form.get("nome"),
        email: form.get("email"),
        senha: form.get("senha"),
        perfis,
        comissao_pct: perfis.includes("tecnico")
          ? Number(form.get("comissao_pct"))
          : 0,
      }),
    })
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
        <Label>Nome</Label>
        <Input name="nome" required className="bg-zinc-800 border-zinc-700 text-white" />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input name="email" type="email" required className="bg-zinc-800 border-zinc-700 text-white" />
      </div>
      <div className="space-y-2">
        <Label>Senha inicial</Label>
        <Input name="senha" type="password" required minLength={6} className="bg-zinc-800 border-zinc-700 text-white" />
      </div>
      <div className="space-y-2">
        <Label>Perfis</Label>
        <div className="flex gap-4">
          {(["admin", "atendente", "tecnico"] as Perfil[]).map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <Checkbox
                checked={perfis.includes(p)}
                onCheckedChange={() => togglePerfil(p)}
              />
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </label>
          ))}
        </div>
      </div>
      {perfis.includes("tecnico") && (
        <div className="space-y-2">
          <Label>Comissão (%)</Label>
          <Input
            name="comissao_pct"
            type="number"
            min={0}
            max={100}
            defaultValue={0}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
      )}
      {erro && <p className="text-red-400 text-sm">{erro}</p>}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={carregando}>
          {carregando ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
