"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, X, Upload, Loader2, CheckCircle } from "lucide-react"

type ClienteOpcao = { _id: string; nome: string; telefone: string }
type CentralOpcao = { _id: string; marca: string; modelo: string; codigo: string }
type TecnicoOpcao = { _id: string; nome: string }

const inputCls = "w-full bg-[#0C0C0C] border border-[#1C1C1C] text-sm text-[#F0F0F0] px-3 py-2 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors placeholder:text-[#333333]"
const labelCls = "block text-[10px] font-semibold uppercase tracking-widest text-[#555555] mb-1"

function EditarOSContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNova = searchParams.get("novo") === "1"

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  // Campos editáveis
  const [clienteId, setClienteId] = useState("")
  const [clienteDisplay, setClienteDisplay] = useState("")
  const [centralId, setCentralId] = useState("")
  const [centralDisplay, setCentralDisplay] = useState("")
  const [defeito, setDefeito] = useState("")
  const [tipoCliente, setTipoCliente] = useState<"mecanico" | "usuario" | "">("")
  const [tecnicoId, setTecnicoId] = useState("")

  // Buscas
  const [buscaCliente, setBuscaCliente] = useState("")
  const [resultadosCliente, setResultadosCliente] = useState<ClienteOpcao[]>([])
  const [buscaCentral, setBuscaCentral] = useState("")
  const [resultadosCentral, setResultadosCentral] = useState<CentralOpcao[]>([])
  const [tecnicos, setTecnicos] = useState<TecnicoOpcao[]>([])

  // Fotos
  const [fotos, setFotos] = useState<string[]>([])
  const [uploadandoFoto, setUploadandoFoto] = useState(false)
  const inputFotoRef = useRef<HTMLInputElement>(null)

  const timerCliente = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerCentral = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function carregar() {
      const [resOS, resTecnicos] = await Promise.all([
        fetch(`/api/os/${id}`),
        fetch("/api/usuarios?perfil=tecnico"),
      ])
      if (!resOS.ok) { router.push(`/os/${id}`); return }
      const os = await resOS.json()
      const tecnicosData = resTecnicos.ok ? await resTecnicos.json() : []

      setClienteId(os.cliente_id?._id ?? "")
      setClienteDisplay(os.cliente_id ? `${os.cliente_id.nome} — ${os.cliente_id.telefone}` : "")
      setCentralId(os.central_id?._id ?? "")
      setCentralDisplay(os.central_id ? `${os.central_id.marca} ${os.central_id.modelo} — ${os.central_id.codigo}` : "")
      setDefeito(os.defeito_descricao ?? "")
      setTipoCliente(os.tipo_cliente ?? "")
      setTecnicoId(os.tecnico_id?._id ?? "")
      setFotos(os.fotos ?? [])
      setTecnicos(tecnicosData)
      setCarregando(false)
    }
    carregar()
  }, [id, router])

  function handleBuscaCliente(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setBuscaCliente(q)
    setClienteId("")
    setClienteDisplay("")
    if (timerCliente.current) clearTimeout(timerCliente.current)
    timerCliente.current = setTimeout(async () => {
      if (!q) { setResultadosCliente([]); return }
      const res = await fetch(`/api/clientes?q=${encodeURIComponent(q)}`)
      if (res.ok) setResultadosCliente(await res.json())
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
      const res = await fetch(`/api/centrais?q=${encodeURIComponent(q)}`)
      if (res.ok) setResultadosCentral(await res.json())
    }, 300)
  }

  function selecionarCentral(c: CentralOpcao) {
    setCentralId(c._id)
    setCentralDisplay(`${c.marca} ${c.modelo} — ${c.codigo}`)
    setBuscaCentral("")
    setResultadosCentral([])
  }

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setUploadandoFoto(true)
    try {
      const form = new FormData()
      form.append("foto", arquivo)
      const res = await fetch(`/api/os/${id}/fotos`, { method: "POST", body: form })
      if (res.ok) {
        const data = await res.json()
        setFotos(data.fotos)
      }
    } finally {
      setUploadandoFoto(false)
      if (inputFotoRef.current) inputFotoRef.current.value = ""
    }
  }

  async function handleRemoverFoto(url: string) {
    const res = await fetch(`/api/os/${id}/fotos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })
    if (res.ok) {
      const data = await res.json()
      setFotos(data.fotos)
    }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteId) { setErro("Selecione um cliente."); return }
    if (!centralId) { setErro("Selecione uma central."); return }
    if (!defeito.trim()) { setErro("Descreva o defeito."); return }
    setErro("")
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        cliente_id: clienteId,
        central_id: centralId,
        defeito_descricao: defeito,
      }
      if (tipoCliente) body.tipo_cliente = tipoCliente
      if (tecnicoId) body.tecnico_id = tecnicoId
      const res = await fetch(`/api/os/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        setErro(data.error ?? "Erro ao salvar.")
        return
      }
      router.refresh()
      router.push(`/os/${id}`)
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return (
    <p className="text-xs uppercase tracking-widest text-[#555555]">Carregando...</p>
  )

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => { router.refresh(); router.push(`/os/${id}`) }} className="text-[#555555] hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-sm font-semibold uppercase tracking-widest text-[#F0F0F0]">
          {isNova ? "Nova OS criada" : "Editar OS"}
        </h1>
      </div>

      {isNova && (
        <div className="flex items-center justify-between bg-[#0D2A1A] border border-[#22C55E]/30 rounded-sm px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-[#22C55E]" />
            <span className="text-xs text-[#22C55E]">OS criada com sucesso. Adicione fotos do defeito se desejar.</span>
          </div>
          <button
            onClick={() => { router.refresh(); router.push(`/os/${id}`) }}
            className="text-[10px] font-semibold uppercase tracking-widest text-[#22C55E] hover:text-white transition-colors ml-4 shrink-0"
          >
            Ir para a OS →
          </button>
        </div>
      )}

      <form onSubmit={handleSalvar} className="space-y-5">
        {/* Cliente */}
        <div>
          <label className={labelCls}>Cliente *</label>
          {clienteId ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm text-[#F0F0F0] bg-[#0C0C0C] border border-[#1C1C1C] px-3 py-2 rounded-sm">
                {clienteDisplay}
              </span>
              <button type="button" onClick={() => { setClienteId(""); setClienteDisplay("") }}
                className="text-[#555555] hover:text-white transition-colors">
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
              <span className="flex-1 text-sm text-[#F0F0F0] bg-[#0C0C0C] border border-[#1C1C1C] px-3 py-2 rounded-sm">
                {centralDisplay}
              </span>
              <button type="button" onClick={() => { setCentralId(""); setCentralDisplay("") }}
                className="text-[#555555] hover:text-white transition-colors">
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
            rows={4}
            className={`${inputCls} resize-none`}
            placeholder="Descreva o defeito relatado pelo cliente..."
          />
        </div>

        {/* Tipo de cliente */}
        <div>
          <label className={labelCls}>Tipo de cliente</label>
          <div className="flex gap-2">
            {(["usuario", "mecanico"] as const).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setTipoCliente(tipoCliente === tipo ? "" : tipo)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold uppercase tracking-widest border transition-colors ${
                  tipoCliente === tipo
                    ? "bg-[#E8FF47] text-black border-[#E8FF47]"
                    : "bg-transparent text-[#555555] border-[#1C1C1C] hover:border-[#555555]"
                }`}
              >
                {tipo === "usuario" ? "Usuário" : "Mecânico"}
              </button>
            ))}
          </div>
        </div>

        {/* Técnico */}
        {tecnicos.length > 0 && (
          <div>
            <label className={labelCls}>Técnico responsável</label>
            <select
              value={tecnicoId}
              onChange={(e) => setTecnicoId(e.target.value)}
              className={inputCls}
            >
              <option value="">— Sem técnico —</option>
              {tecnicos.map((t) => (
                <option key={t._id} value={t._id}>{t.nome}</option>
              ))}
            </select>
          </div>
        )}

        {erro && <p className="text-xs text-red-400">{erro}</p>}

        <button
          type="submit"
          disabled={salvando}
          className="w-full py-2.5 text-xs font-semibold uppercase tracking-widest bg-[#E8FF47] text-black rounded-sm hover:bg-[#d4eb3a] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {salvando && <Loader2 size={12} className="animate-spin" />}
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>

      {/* Fotos */}
      <div>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1C1C1C]">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#555555]">
            Fotos do defeito
          </span>
          <button
            type="button"
            onClick={() => inputFotoRef.current?.click()}
            disabled={uploadandoFoto}
            className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#555555] hover:text-white transition-colors disabled:opacity-50"
          >
            {uploadandoFoto
              ? <Loader2 size={12} className="animate-spin" />
              : <Upload size={12} />}
            {uploadandoFoto ? "Enviando..." : "Adicionar foto"}
          </button>
          <input
            ref={inputFotoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUploadFoto}
          />
        </div>

        {fotos.length === 0 ? (
          <div className="border border-dashed border-[#1C1C1C] rounded-sm p-8 text-center">
            <p className="text-xs text-[#555555]">Nenhuma foto adicionada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {fotos.map((url) => (
              <div key={url} className="relative group aspect-square bg-[#111111] rounded-sm overflow-hidden border border-[#1C1C1C]">
                <img src={url} alt="Foto do defeito" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoverFoto(url)}
                  className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function EditarOSPage() {
  return (
    <Suspense fallback={<p className="text-xs uppercase tracking-widest text-[#555555]">Carregando...</p>}>
      <EditarOSContent />
    </Suspense>
  )
}
