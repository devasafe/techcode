"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ClienteOpcao = { _id: string; nome: string; telefone: string }
type CentralOpcao = { _id: string; marca: string; modelo: string; codigo: string }

type OSFormProps = {
  clientePreenchido?: ClienteOpcao
  onSalvo: (osId: string) => void
  onCancelar: () => void
}

export function OSForm({ clientePreenchido, onSalvo, onCancelar }: OSFormProps) {
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)

  const [clienteId, setClienteId] = useState(clientePreenchido?._id ?? "")
  const [clienteDisplay, setClienteDisplay] = useState(
    clientePreenchido ? `${clientePreenchido.nome} — ${clientePreenchido.telefone}` : ""
  )
  const [buscaCliente, setBuscaCliente] = useState("")
  const [resultadosCliente, setResultadosCliente] = useState<ClienteOpcao[]>([])
  const timerCliente = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortCliente = useRef<AbortController | null>(null)

  const [centralId, setCentralId] = useState("")
  const [centralDisplay, setCentralDisplay] = useState("")
  const [buscaCentral, setBuscaCentral] = useState("")
  const [resultadosCentral, setResultadosCentral] = useState<CentralOpcao[]>([])
  const timerCentral = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortCentral = useRef<AbortController | null>(null)

  function handleBuscaCliente(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setBuscaCliente(q)
    setClienteId("")
    setClienteDisplay("")
    if (timerCliente.current) clearTimeout(timerCliente.current)
    timerCliente.current = setTimeout(async () => {
      if (!q) { setResultadosCliente([]); return }
      if (abortCliente.current) abortCliente.current.abort()
      abortCliente.current = new AbortController()
      try {
        const res = await fetch(`/api/clientes?q=${encodeURIComponent(q)}`, { signal: abortCliente.current.signal })
        if (res.ok) setResultadosCliente(await res.json())
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") { /* ignore */ }
      }
    }, 300)
  }

  function selecionarCliente(c: ClienteOpcao) {
    setClienteId(c._id)
    setClienteDisplay(`${c.nome} — ${c.telefone}`)
    setBuscaCliente("")
    setResultadosCliente([])
  }

  function handleBuscaCentral(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setBuscaCentral(q)
    setCentralId("")
    setCentralDisplay("")
    if (timerCentral.current) clearTimeout(timerCentral.current)
    timerCentral.current = setTimeout(async () => {
      if (!q) { setResultadosCentral([]); return }
      if (abortCentral.current) abortCentral.current.abort()
      abortCentral.current = new AbortController()
      try {
        const res = await fetch(`/api/centrais?q=${encodeURIComponent(q)}`, { signal: abortCentral.current.signal })
        if (res.ok) setResultadosCentral(await res.json())
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") { /* ignore */ }
      }
    }, 300)
  }

  function selecionarCentral(c: CentralOpcao) {
    setCentralId(c._id)
    setCentralDisplay(`${c.marca} ${c.modelo} — ${c.codigo}`)
    setBuscaCentral("")
    setResultadosCentral([])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!clienteId) { setErro("Selecione um cliente."); return }
    if (!centralId) { setErro("Selecione uma central."); return }
    setErro("")
    setCarregando(true)
    const form = new FormData(e.currentTarget)
    const body = {
      cliente_id: clienteId,
      central_id: centralId,
      defeito_descricao: form.get("defeito_descricao") as string,
    }
    try {
      const res = await fetch("/api/os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        let data: { error?: string } = {}
        try { data = await res.json() } catch { /* ignore */ }
        setErro(data.error ?? "Erro ao criar OS.")
        return
      }
      const os = await res.json()
      onSalvo(os._id)
    } catch {
      setErro("Erro de conexão. Tente novamente.")
    } finally {
      setCarregando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Cliente */}
      <div className="space-y-2">
        <Label>Cliente *</Label>
        {clienteId ? (
          <div className="flex items-center gap-2">
            <p className="text-white text-sm flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2">
              {clienteDisplay}
            </p>
            <Button type="button" variant="outline" size="sm"
              onClick={() => { setClienteId(""); setClienteDisplay("") }}>
              Trocar
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Input
              value={buscaCliente}
              onChange={handleBuscaCliente}
              placeholder="Buscar por nome ou telefone..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
            {resultadosCliente.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-48 overflow-auto">
                {resultadosCliente.map((c) => (
                  <button key={c._id} type="button" onClick={() => selecionarCliente(c)}
                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-700">
                    {c.nome} — {c.telefone}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Central */}
      <div className="space-y-2">
        <Label>Central *</Label>
        {centralId ? (
          <div className="flex items-center gap-2">
            <p className="text-white text-sm flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2">
              {centralDisplay}
            </p>
            <Button type="button" variant="outline" size="sm"
              onClick={() => { setCentralId(""); setCentralDisplay("") }}>
              Trocar
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Input
              value={buscaCentral}
              onChange={handleBuscaCentral}
              placeholder="Buscar por marca, modelo ou código..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
            {resultadosCentral.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-48 overflow-auto">
                {resultadosCentral.map((c) => (
                  <button key={c._id} type="button" onClick={() => selecionarCentral(c)}
                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-700">
                    {c.marca} {c.modelo} — {c.codigo}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Defeito */}
      <div className="space-y-2">
        <Label>Descrição do defeito *</Label>
        <textarea
          name="defeito_descricao"
          required
          rows={3}
          placeholder="Descreva o defeito relatado pelo cliente..."
          className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-zinc-600"
        />
      </div>

      {erro && <p className="text-red-400 text-sm">{erro}</p>}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={carregando}>
          {carregando ? "Criando..." : "Criar OS"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
