"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { UsuarioForm } from "@/components/equipe/UsuarioForm"
import { UserPlus } from "lucide-react"

type Usuario = {
  _id: string
  nome: string
  email: string
  perfis: string[]
  comissao_pct: number
  ativo: boolean
}

export default function EquipePage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [abrirForm, setAbrirForm] = useState(false)

  async function carregar() {
    const res = await fetch("/api/usuarios")
    const data = await res.json()
    setUsuarios(data)
  }

  useEffect(() => { carregar() }, [])

  async function desativar(id: string) {
    await fetch(`/api/usuarios/${id}`, { method: "DELETE" })
    carregar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Equipe</h1>
        <Button onClick={() => setAbrirForm(true)}>
          <UserPlus size={16} className="mr-2" />
          Novo usuário
        </Button>
      </div>

      <div className="grid gap-3">
        {usuarios.map((u) => (
          <Card key={u._id} className="bg-zinc-900 border-zinc-800">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium text-white">{u.nome}</p>
                <p className="text-sm text-zinc-400">{u.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {u.perfis.map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs capitalize">
                      {p}
                    </Badge>
                  ))}
                </div>
                {u.perfis.includes("tecnico") && (
                  <span className="text-xs text-zinc-400">{u.comissao_pct}%</span>
                )}
                {u.ativo ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => desativar(u._id)}
                  >
                    Desativar
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-zinc-500">Inativo</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={abrirForm} onOpenChange={setAbrirForm}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Novo usuário</DialogTitle>
          </DialogHeader>
          <UsuarioForm
            onSalvo={() => { setAbrirForm(false); carregar() }}
            onCancelar={() => setAbrirForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
