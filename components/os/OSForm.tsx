"use client"

import { useRef, useState } from "react"
import { Upload, X, Loader2 } from "lucide-react"

type ClienteOpcao = { _id: string; nome: string; telefone: string }
type CentralOpcao = { _id: string; marca: string; modelo: string; codigo: string }

type FotoLocal = { file: File; preview: string }

type OSFormProps = {
  clientePreenchido?: ClienteOpcao
  onSalvo: (osId: string) => void
  onCancelar: () => void
}

const inputCls = "w-full bg-[#0C0C0C] border border-[#1C1C1C] text-sm text-[#F0F0F0] px-3 py-2 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors placeholder:text-[#333333]"
const labelCls = "block text-[10px] font-semibold uppercase tracking-widest text-[#555555] mb-1"

export function OSForm({ clientePreenchido, onSalvo, onCancelar }: OSFormProps) {
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [progressoFotos, setProgressoFotos] = useState("")

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

  const [defeito, setDefeito] = useState("")
  const [fotos, setFotos] = useState<FotoLocal[]>([])
  const inputFotoRef = useRef<HTMLInputElement>(null)

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

  function handleAdicionarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? [])
    const novas: FotoLocal[] = arquivos.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setFotos((prev) => [...prev, ...novas])
    if (inputFotoRef.current) inputFotoRef.current.value = ""
  }

  function removerFoto(idx: number) {
    setFotos((prev) => {
      URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!clienteId) { setErro("Selecione um cliente."); return }
    if (!centralId) { setErro("Selecione uma central."); return }
    if (!defeito.trim()) { setErro("Descreva o defeito."); return }
    setErro("")
    setCarregando(true)

    try {
      // 1. Criar OS
      const res = await fetch("/api/os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente_id: clienteId, central_id: centralId, defeito_descricao: defeito }),
      })
      if (!res.ok) {
        let data: { error?: string } = {}
        try { data = await res.json() } catch { /* ignore */ }
        setErro(data.error ?? "Erro ao criar OS.")
        return
      }
      const os = await res.json()

      // 2. Fazer upload das fotos (se houver)
      if (fotos.length > 0) {
        for (let i = 0; i < fotos.length; i++) {
          setProgressoFotos(`Enviando foto ${i + 1}/${fotos.length}...`)
          const form = new FormData()
          form.append("foto", fotos[i].file)
          await fetch(`/api/os/${os._id}/fotos`, { method: "POST", body: form })
        }
      }

      onSalvo(os._id)
    } catch {
      setErro("Erro de conexão. Tente novamente.")
    } finally {
      setCarregando(false)
      setProgressoFotos("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Cliente */}
      <div>
        <label className={labelCls}>Cliente *</label>
        {clienteId ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm text-[#F0F0F0] bg-[#0C0C0C] border border-[#1C1C1C] px-3 py-2 rounded-sm truncate">
              {clienteDisplay}
            </span>
            <button type="button" onClick={() => { setClienteId(""); setClienteDisplay("") }}
              className="text-[#555555] hover:text-white transition-colors shrink-0">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              value={buscaCliente}
              onChange={handleBuscaCliente}
              placeholder="Buscar por nome ou telefone..."
              className={inputCls}
            />
            {resultadosCliente.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-[#111111] border border-[#1C1C1C] rounded-sm shadow-lg max-h-48 overflow-auto">
                {resultadosCliente.map((c) => (
                  <button key={c._id} type="button" onClick={() => selecionarCliente(c)}
                    className="w-full text-left px-3 py-2 text-sm text-[#F0F0F0] hover:bg-[#1C1C1C]">
                    {c.nome} — {c.telefone}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Central */}
      <div>
        <label className={labelCls}>Central *</label>
        {centralId ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm text-[#F0F0F0] bg-[#0C0C0C] border border-[#1C1C1C] px-3 py-2 rounded-sm truncate">
              {centralDisplay}
            </span>
            <button type="button" onClick={() => { setCentralId(""); setCentralDisplay("") }}
              className="text-[#555555] hover:text-white transition-colors shrink-0">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              value={buscaCentral}
              onChange={handleBuscaCentral}
              placeholder="Buscar por marca, modelo ou código..."
              className={inputCls}
            />
            {resultadosCentral.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-[#111111] border border-[#1C1C1C] rounded-sm shadow-lg max-h-48 overflow-auto">
                {resultadosCentral.map((c) => (
                  <button key={c._id} type="button" onClick={() => selecionarCentral(c)}
                    className="w-full text-left px-3 py-2 text-sm text-[#F0F0F0] hover:bg-[#1C1C1C]">
                    {c.marca} {c.modelo} — {c.codigo}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Defeito */}
      <div>
        <label className={labelCls}>Descrição do defeito *</label>
        <textarea
          value={defeito}
          onChange={(e) => setDefeito(e.target.value)}
          required
          rows={3}
          placeholder="Descreva o defeito relatado pelo cliente..."
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Fotos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelCls + " mb-0"}>Fotos do defeito</label>
          <button
            type="button"
            onClick={() => inputFotoRef.current?.click()}
            className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#555555] hover:text-white transition-colors"
          >
            <Upload size={11} />
            Adicionar
          </button>
          <input
            ref={inputFotoRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleAdicionarFotos}
          />
        </div>

        {fotos.length === 0 ? (
          <button
            type="button"
            onClick={() => inputFotoRef.current?.click()}
            className="w-full border border-dashed border-[#1C1C1C] rounded-sm py-5 text-xs text-[#333333] hover:border-[#2A2A2A] hover:text-[#555555] transition-colors"
          >
            Toque para adicionar fotos
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {fotos.map((f, i) => (
              <div key={i} className="relative aspect-square bg-[#111111] rounded-sm overflow-hidden border border-[#1C1C1C] group">
                <img src={f.preview} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removerFoto(i)}
                  className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => inputFotoRef.current?.click()}
              className="aspect-square border border-dashed border-[#1C1C1C] rounded-sm flex items-center justify-center text-[#333333] hover:border-[#2A2A2A] hover:text-[#555555] transition-colors"
            >
              <Upload size={16} />
            </button>
          </div>
        )}
      </div>

      {erro && <p className="text-xs text-red-400">{erro}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={carregando}
          className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest bg-[#E8FF47] text-black rounded-sm hover:bg-[#d4eb3a] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {carregando && <Loader2 size={12} className="animate-spin" />}
          {progressoFotos || (carregando ? "Criando..." : "Criar OS")}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={carregando}
          className="px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#555555] hover:text-white border border-[#1C1C1C] rounded-sm transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
