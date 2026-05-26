"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
        <button
          onClick={() => router.back()}
          className="text-[#555555] hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-sm font-semibold uppercase tracking-widest text-[#F0F0F0]">
          Nova Ordem de Serviço
        </h1>
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
    <Suspense fallback={<p className="text-xs uppercase tracking-widest text-[#555555]">Carregando...</p>}>
      <NovaOSContent />
    </Suspense>
  )
}
