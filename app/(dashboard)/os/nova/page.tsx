"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { OSForm } from "@/components/os/OSForm"
import { ArrowLeft } from "lucide-react"

type ClienteOpcao = { _id: string; nome: string; telefone: string }

function NovaOSContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clienteIdParam = searchParams.get("cliente")
  const [clientePreenchido, setClientePreenchido] = useState<ClienteOpcao | undefined>()

  useEffect(() => {
    if (!clienteIdParam) return
    fetch(`/api/clientes/${clienteIdParam}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setClientePreenchido(data) })
  }, [clienteIdParam])

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft size={16} />
        </Button>
        <h1 className="text-2xl font-bold text-white">Nova Ordem de Serviço</h1>
      </div>
      <OSForm
        clientePreenchido={clientePreenchido}
        onSalvo={(id) => router.push(`/os/${id}`)}
        onCancelar={() => router.back()}
      />
    </div>
  )
}

export default function NovaOSPage() {
  return (
    <Suspense fallback={<p className="text-zinc-400 text-sm">Carregando...</p>}>
      <NovaOSContent />
    </Suspense>
  )
}
