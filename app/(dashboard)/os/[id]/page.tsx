"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Trash2, FileDown } from "lucide-react"
import type { OSStatus } from "@/types"
import { OSPrint } from "@/components/os/OSPrint"

type Peca = { nome: string; custo: number }

type OS = {
  _id: string
  numero_os: number
  status: OSStatus
  defeito_descricao: string
  solucao_descricao?: string
  motivo_cancelamento?: string
  pecas: Peca[]
  valor_cobrado: number
  custo_total_pecas: number
  lucro_liquido: number
  garantia_dias: number
  garantia_ate?: string
  created_at: string
  closed_at?: string
  cliente_id: { _id: string; nome: string; telefone: string } | null
  central_id: { _id: string; marca: string; modelo: string; codigo: string } | null
  tecnico_id: { _id: string; nome: string } | null
  retornos_garantia: { _id: string; data: string; descricao: string }[]
  devolucao?: {
    tipo: string
    motivo: string
    valor_reembolsado?: number
    central_adquirida?: string
    custo_central?: number
    novo_valor_cobrado?: number
    data: string
  }
}

const STATUS_BADGE: Record<OSStatus, { label: string; cls: string }> = {
  aberta:        { label: "Aberta",        cls: "bg-[#1C1C1C] text-[#888888]" },
  na_fila:       { label: "Na fila",       cls: "bg-[#1E2A3A] text-[#60A5FA]" },
  em_andamento:  { label: "Em andamento",  cls: "bg-[#2A2000] text-[#F59E0B]" },
  concluida:     { label: "Concluída",     cls: "bg-[#0D2A1A] text-[#22C55E]" },
  devolvida:     { label: "Devolvida",     cls: "bg-[#2A0D0D] text-[#FF4444]" },
  substituida:   { label: "Substituída",   cls: "bg-[#2A1500] text-[#FB923C]" },
  cancelada:     { label: "Cancelada",     cls: "bg-[#1A1A1A] text-[#555555]" },
}

const PODE_CANCELAR: OSStatus[] = ["aberta", "na_fila", "em_andamento"]

const inputCls = "w-full bg-[#0C0C0C] border border-[#1C1C1C] text-sm text-[#F0F0F0] px-3 py-2 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors placeholder:text-[#333333]"
const labelCls = "block text-[10px] font-semibold uppercase tracking-widest text-[#555555] mb-1"

export default function OSDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [os, setOS] = useState<OS | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [abrirConcluir, setAbrirConcluir] = useState(false)

  const [solucao, setSolucao] = useState("")
  const [valorCobrado, setValorCobrado] = useState("0")
  const [garantiaDias, setGarantiaDias] = useState("90")
  const [pecas, setPecas] = useState<Peca[]>([])
  const [nomePeca, setNomePeca] = useState("")
  const [custoPeca, setCustoPeca] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erroConcluir, setErroConcluir] = useState("")
  const [tecnicos, setTecnicos] = useState<{ _id: string; nome: string; comissao_pct: number }[]>([])
  const [tecnicoId, setTecnicoId] = useState("")
  const [atualizando, setAtualizando] = useState(false)

  const [abrirRetorno, setAbrirRetorno] = useState(false)
  const [descricaoRetorno, setDescricaoRetorno] = useState("")
  const [salvandoRetorno, setSalvandoRetorno] = useState(false)
  const [erroRetorno, setErroRetorno] = useState("")

  const [centralEmBomEstado, setCentralEmBomEstado] = useState(false)

  const [abrirCancelar, setAbrirCancelar] = useState(false)
  const [motivoCancelamento, setMotivoCancelamento] = useState("")
  const [salvandoCancelamento, setSalvandoCancelamento] = useState(false)
  const [erroCancelamento, setErroCancelamento] = useState("")

  const [abrirDevolucao, setAbrirDevolucao] = useState(false)
  const [tipoDevolucao, setTipoDevolucao] = useState<"reembolso" | "substituicao">("reembolso")
  const [motivoDevolucao, setMotivoDevolucao] = useState("")
  const [valorReembolsado, setValorReembolsado] = useState("0")
  const [centralAdquirida, setCentralAdquirida] = useState("")
  const [custoCentral, setCustoCentral] = useState("0")
  const [novoValorCobrado, setNovoValorCobrado] = useState("0")
  const [salvandoDevolucao, setSalvandoDevolucao] = useState(false)
  const [erroDevolucao, setErroDevolucao] = useState("")

  async function carregar() {
    setCarregando(true)
    try {
      const res = await fetch(`/api/os/${id}`)
      if (!res.ok) { router.push("/os"); return }
      const data = await res.json()
      setOS(data)
      setPecas(data.pecas ?? [])
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [id])

  useEffect(() => {
    fetch("/api/usuarios")
      .then((r) => (r.ok ? r.json() : []))
      .then((lista: { _id: string; nome: string; perfis: string[]; comissao_pct: number }[]) => {
        setTecnicos(lista.filter((u) => u.perfis.includes("tecnico")))
      })
      .catch(() => {})
  }, [])

  async function atualizarStatus(novoStatus: OSStatus) {
    if (atualizando) return
    setAtualizando(true)
    try {
      const res = await fetch(`/api/os/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      })
      if (res.ok) carregar()
    } finally {
      setAtualizando(false)
    }
  }

  async function enviarRetorno() {
    if (!descricaoRetorno.trim()) return
    setSalvandoRetorno(true)
    setErroRetorno("")
    try {
      const res = await fetch(`/api/os/${id}/retorno`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descricao: descricaoRetorno }),
      })
      if (!res.ok) {
        let data: { error?: string } = {}
        try { data = await res.json() } catch { /* ignore */ }
        setErroRetorno(data.error ?? "Erro ao registrar retorno.")
        return
      }
      setAbrirRetorno(false)
      setDescricaoRetorno("")
      carregar()
    } catch {
      setErroRetorno("Erro de conexão. Tente novamente.")
    } finally {
      setSalvandoRetorno(false)
    }
  }

  async function enviarDevolucao() {
    if (!motivoDevolucao.trim()) return
    setSalvandoDevolucao(true)
    setErroDevolucao("")
    try {
      const body: Record<string, unknown> = { tipo: tipoDevolucao, motivo: motivoDevolucao }
      if (tipoDevolucao === "reembolso") {
        body.valor_reembolsado = parseFloat(valorReembolsado) || 0
      } else {
        body.central_adquirida = centralAdquirida
        body.custo_central = parseFloat(custoCentral) || 0
        body.novo_valor_cobrado = parseFloat(novoValorCobrado) || 0
      }
      const res = await fetch(`/api/os/${id}/devolucao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        let data: { error?: string } = {}
        try { data = await res.json() } catch { /* ignore */ }
        setErroDevolucao(data.error ?? "Erro ao registrar devolução.")
        return
      }
      setAbrirDevolucao(false)
      carregar()
    } catch {
      setErroDevolucao("Erro de conexão. Tente novamente.")
    } finally {
      setSalvandoDevolucao(false)
    }
  }

  async function cancelarOS() {
    setSalvandoCancelamento(true)
    setErroCancelamento("")
    try {
      const res = await fetch(`/api/os/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelada",
          ...(motivoCancelamento.trim() && { motivo_cancelamento: motivoCancelamento.trim() }),
        }),
      })
      if (!res.ok) {
        let data: { error?: string } = {}
        try { data = await res.json() } catch { /* ignore */ }
        setErroCancelamento(data.error ?? "Erro ao cancelar OS.")
        return
      }
      setAbrirCancelar(false)
      carregar()
    } catch {
      setErroCancelamento("Erro de conexão. Tente novamente.")
    } finally {
      setSalvandoCancelamento(false)
    }
  }

  function adicionarPeca() {
    if (!nomePeca.trim() || !custoPeca) return
    setPecas((prev) => [...prev, { nome: nomePeca.trim(), custo: parseFloat(custoPeca) || 0 }])
    setNomePeca("")
    setCustoPeca("")
  }

  async function concluirOS() {
    setErroConcluir("")
    setSalvando(true)
    try {
      const res = await fetch(`/api/os/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "concluida",
          solucao_descricao: solucao,
          pecas,
          valor_cobrado: parseFloat(valorCobrado) || 0,
          garantia_dias: parseInt(garantiaDias) || 0,
          ...(tecnicoId && { tecnico_id: tecnicoId }),
        }),
      })
      if (!res.ok) {
        let data: { error?: string } = {}
        try { data = await res.json() } catch { /* ignore */ }
        setErroConcluir(data.error ?? "Erro ao concluir OS.")
        return
      }
      setAbrirConcluir(false)
      carregar()
    } catch {
      setErroConcluir("Erro de conexão. Tente novamente.")
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <p className="text-xs uppercase tracking-widest text-[#555555]">Carregando...</p>
  if (!os) return null

  const badge = STATUS_BADGE[os.status] ?? STATUS_BADGE.aberta
  const custoTotal = pecas.reduce((s, p) => s + p.custo, 0)

  function exportarPDF() {
    window.print()
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/os")}
          className="text-[#555555] hover:text-white transition-colors print:hidden"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-sm font-bold text-[#E8FF47]">OS #{os.numero_os}</h1>
            <span className={`text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-sm ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <p className="font-mono text-[10px] text-[#555555] mt-0.5">
            Aberta em {new Date(os.created_at).toLocaleDateString("pt-BR")}
            {os.closed_at && ` · Concluída em ${new Date(os.closed_at).toLocaleDateString("pt-BR")}`}
          </p>
        </div>
        <div className="print:hidden flex items-center gap-2">
          {PODE_CANCELAR.includes(os.status) && (
            <button
              onClick={() => setAbrirCancelar(true)}
              className="text-[10px] font-semibold uppercase tracking-widest text-[#555555] hover:text-[#FF4444] border border-[#1C1C1C] hover:border-[#2A0D0D] px-3 py-1.5 rounded-sm transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={exportarPDF}
            className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#555555] hover:text-white border border-[#1C1C1C] hover:border-[#2A2A2A] px-3 py-1.5 rounded-sm transition-colors"
          >
            <FileDown size={12} />
            PDF
          </button>
        </div>
      </div>

      {/* Ação de status */}
      {os.status === "aberta" && (
        <button
          onClick={() => atualizarStatus("na_fila")}
          disabled={atualizando}
          className="bg-[#1E2A3A] text-[#60A5FA] text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-50 transition-all"
        >
          Colocar na fila
        </button>
      )}
      {os.status === "na_fila" && (
        <button
          onClick={() => atualizarStatus("em_andamento")}
          disabled={atualizando}
          className="bg-[#2A2000] text-[#F59E0B] text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-50 transition-all"
        >
          Iniciar serviço
        </button>
      )}
      {os.status === "em_andamento" && (
        <button
          onClick={() => setAbrirConcluir(true)}
          className="bg-[#E8FF47] text-black text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-sm hover:brightness-110 transition-all"
        >
          Concluir OS
        </button>
      )}

      {/* Cards cliente + central */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#555555] mb-2">Cliente</p>
          {os.cliente_id ? (
            <>
              <Link href={`/clientes/${os.cliente_id._id}`}
                className="text-sm font-medium text-[#F0F0F0] hover:text-[#E8FF47] transition-colors">
                {os.cliente_id.nome}
              </Link>
              <p className="font-mono text-[10px] text-[#555555] mt-0.5">{os.cliente_id.telefone}</p>
            </>
          ) : (
            <p className="text-sm text-[#555555]">—</p>
          )}
        </div>

        <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#555555] mb-2">Central</p>
          {os.central_id ? (
            <>
              <Link href={`/centrais/${os.central_id._id}`}
                className="text-sm font-medium text-[#F0F0F0] hover:text-[#E8FF47] transition-colors">
                {os.central_id.marca} <span className="font-mono text-[#E8FF47]">{os.central_id.modelo}</span>
              </Link>
              <p className="font-mono text-[10px] text-[#555555] mt-0.5">{os.central_id.codigo}</p>
            </>
          ) : (
            <p className="text-sm text-[#555555]">—</p>
          )}
        </div>
      </div>

      {/* Defeito */}
      <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#555555] mb-2">Defeito relatado</p>
        <p className="text-sm text-[#F0F0F0]">{os.defeito_descricao}</p>
      </div>

      {/* Cancelamento */}
      {os.status === "cancelada" && (
        <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#555555] mb-2">OS Cancelada</p>
          <p className="text-sm text-[#555555]">
            {os.motivo_cancelamento || "Sem motivo registrado."}
          </p>
        </div>
      )}

      {/* Solução */}
      {os.solucao_descricao && (
        <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#22C55E] mb-2">Solução aplicada</p>
          <p className="text-sm text-[#F0F0F0]">{os.solucao_descricao}</p>
        </div>
      )}

      {/* Resultado financeiro */}
      {os.status === "concluida" && (
        <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#555555] mb-3">Resultado</p>
          {os.tecnico_id && (
            <div className="flex justify-between text-xs mb-3">
              <span className="text-[#555555]">Técnico responsável</span>
              <span className="text-[#F0F0F0] font-medium">{os.tecnico_id.nome}</span>
            </div>
          )}
          {os.pecas.length > 0 && (
            <div className="mb-3 space-y-1">
              <p className="text-[9px] uppercase tracking-widest text-[#555555] mb-1">Peças</p>
              {os.pecas.map((p, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-[#F0F0F0]">{p.nome}</span>
                  <span className="font-mono text-[#555555]">R$ {p.custo.toFixed(2).replace(".", ",")}</span>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-[#1C1C1C] pt-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[#555555]">Custo de peças</span>
              <span className="font-mono text-[#555555]">R$ {os.custo_total_pecas.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#555555]">Valor cobrado</span>
              <span className="font-mono font-medium text-[#F0F0F0]">R$ {os.valor_cobrado.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className={`flex justify-between text-sm font-medium ${os.lucro_liquido >= 0 ? "text-[#22C55E]" : "text-[#FF4444]"}`}>
              <span>Lucro líquido</span>
              <span className="font-mono">R$ {os.lucro_liquido.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>
          {os.garantia_ate && (
            <p className="text-[10px] text-[#555555] mt-3">
              Garantia até {new Date(os.garantia_ate).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
      )}

      {/* Retornos de garantia */}
      {os.status === "concluida" && (
        <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#555555]">
              Retornos de garantia <span className="font-mono">{os.retornos_garantia.length}</span>
            </p>
            <button
              onClick={() => setAbrirRetorno(true)}
              className="text-[10px] font-semibold uppercase tracking-widest text-[#555555] hover:text-white transition-colors"
            >
              + Registrar
            </button>
          </div>
          {os.retornos_garantia.length === 0 ? (
            <p className="text-[10px] text-[#333333]">Nenhum retorno registrado.</p>
          ) : (
            <div className="space-y-3">
              {os.retornos_garantia.map((r) => (
                <div key={r._id}>
                  <p className="text-sm text-[#F0F0F0]">{r.descricao}</p>
                  <p className="font-mono text-[10px] text-[#555555]">{new Date(r.data).toLocaleDateString("pt-BR")}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Devolução registrada */}
      {os.devolucao && (
        <div className="bg-[#111111] border border-[#2A0D0D] rounded-sm p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FF4444] mb-3">
            {os.devolucao.tipo === "reembolso" ? "Devolução — Reembolso" : "Devolução — Substituição"}
          </p>
          <div className="space-y-1 text-sm">
            <p className="text-[#F0F0F0]">{os.devolucao.motivo}</p>
            {os.devolucao.valor_reembolsado != null && (
              <p className="font-mono text-xs text-[#555555]">
                Reembolso: R$ {os.devolucao.valor_reembolsado.toFixed(2).replace(".", ",")}
              </p>
            )}
            {os.devolucao.central_adquirida && (
              <p className="text-xs text-[#555555]">Central substituta: {os.devolucao.central_adquirida}</p>
            )}
            <p className="font-mono text-[10px] text-[#555555]">
              {new Date(os.devolucao.data).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
      )}

      {/* Botão registrar devolução */}
      {os.status === "concluida" && !os.devolucao && (
        <button
          onClick={() => setAbrirDevolucao(true)}
          className="text-[10px] font-semibold uppercase tracking-widest text-[#555555] hover:text-[#FF4444] border border-[#1C1C1C] hover:border-[#2A0D0D] px-4 py-2 rounded-sm transition-colors"
        >
          Registrar devolução
        </button>
      )}

      {/* Dialog — Cancelar OS */}
      <Dialog open={abrirCancelar} onOpenChange={(open) => { setAbrirCancelar(open); if (!open) { setMotivoCancelamento(""); setErroCancelamento("") } }}>
        <DialogContent className="bg-[#111111] border-[#1C1C1C] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#F0F0F0] text-sm uppercase tracking-widest">
              Cancelar OS #{os.numero_os}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-[#555555]">
              A OS será marcada como cancelada. Essa ação não pode ser desfeita.
            </p>
            <div>
              <label className={labelCls}>Motivo (opcional)</label>
              <textarea
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                rows={3}
                placeholder="Ex: cliente não aceitou o orçamento..."
                className="w-full bg-[#0C0C0C] border border-[#1C1C1C] text-sm text-[#F0F0F0] px-3 py-2 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors placeholder:text-[#333333] resize-none"
              />
            </div>
            {erroCancelamento && <p className="text-xs text-[#FF4444]">{erroCancelamento}</p>}
            <div className="flex gap-2">
              <button
                onClick={cancelarOS}
                disabled={salvandoCancelamento}
                className="bg-[#2A0D0D] text-[#FF4444] text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {salvandoCancelamento ? "Cancelando..." : "Confirmar cancelamento"}
              </button>
              <button
                onClick={() => setAbrirCancelar(false)}
                className="text-xs font-semibold uppercase tracking-widest text-[#555555] hover:text-white px-4 py-2 border border-[#1C1C1C] rounded-sm transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog — Concluir OS */}
      <Dialog open={abrirConcluir} onOpenChange={setAbrirConcluir}>
        <DialogContent className="bg-[#111111] border-[#1C1C1C] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#F0F0F0] text-sm uppercase tracking-widest">
              Concluir OS #{os.numero_os}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Central em bom estado */}
            <button
              type="button"
              onClick={() => {
                const próximo = !centralEmBomEstado
                setCentralEmBomEstado(próximo)
                if (próximo) setSolucao("Central testada — em bom estado, sem defeito identificado.")
                else setSolucao("")
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm border text-left transition-colors ${
                centralEmBomEstado
                  ? "border-[#22C55E] bg-[#0D2A1A]"
                  : "border-[#1C1C1C] bg-[#0C0C0C] hover:border-[#2A2A2A]"
              }`}
            >
              <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
                centralEmBomEstado ? "border-[#22C55E] bg-[#22C55E]" : "border-[#555555]"
              }`}>
                {centralEmBomEstado && (
                  <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
                    <path d="M1 4l3 3 5-6" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`text-xs font-semibold ${centralEmBomEstado ? "text-[#22C55E]" : "text-[#F0F0F0]"}`}>
                  Central em bom estado
                </p>
                <p className="text-[10px] text-[#555555]">Nenhum defeito encontrado — apenas teste</p>
              </div>
            </button>

            {tecnicos.length > 0 && (
              <div>
                <label className={labelCls}>Técnico responsável</label>
                <Select value={tecnicoId} onValueChange={(v) => setTecnicoId(v ?? "")}>
                  <SelectTrigger className="bg-[#0C0C0C] border-[#1C1C1C] text-[#F0F0F0] text-xs rounded-sm focus:ring-0 focus:border-[#E8FF47]">
                    <SelectValue placeholder="Sem técnico (sem comissão)" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111111] border-[#1C1C1C]">
                    {tecnicos.map((t) => (
                      <SelectItem key={t._id} value={t._id} className="text-[#F0F0F0] focus:bg-[#1C1C1C] text-xs">
                        {t.nome} — {t.comissao_pct}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className={labelCls}>Solução aplicada *</label>
              <textarea
                value={solucao}
                onChange={(e) => setSolucao(e.target.value)}
                rows={3}
                required
                placeholder="Descreva o que foi feito..."
                className="w-full bg-[#0C0C0C] border border-[#1C1C1C] text-sm text-[#F0F0F0] px-3 py-2 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors placeholder:text-[#333333] resize-none"
              />
            </div>

            {!centralEmBomEstado && (
              <div>
                <label className={labelCls}>Peças utilizadas</label>
                <div className="space-y-1.5 mb-2">
                  {pecas.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-[#0C0C0C] border border-[#1C1C1C] px-3 py-1.5 rounded-sm">
                      <span className="flex-1 text-[#F0F0F0]">{p.nome}</span>
                      <span className="font-mono text-[#555555]">R$ {p.custo.toFixed(2).replace(".", ",")}</span>
                      <button type="button" onClick={() => setPecas(pecas.filter((_, idx) => idx !== i))}>
                        <Trash2 size={12} className="text-[#555555] hover:text-[#FF4444] transition-colors" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={nomePeca} onChange={(e) => setNomePeca(e.target.value)}
                    placeholder="Nome da peça"
                    className={`${inputCls} flex-1`} />
                  <input value={custoPeca} onChange={(e) => setCustoPeca(e.target.value)}
                    placeholder="R$" type="number" step="0.01" min="0"
                    className={`${inputCls} w-24`} />
                  <button type="button" onClick={adicionarPeca}
                    className="bg-[#1C1C1C] text-[#F0F0F0] text-xs font-semibold px-3 py-2 rounded-sm hover:bg-[#2A2A2A] transition-colors">
                    +
                  </button>
                </div>
                {pecas.length > 0 && (
                  <p className="font-mono text-[10px] text-[#555555] mt-1">
                    Total: R$ {custoTotal.toFixed(2).replace(".", ",")}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Valor cobrado (R$) *</label>
                <input value={valorCobrado} onChange={(e) => setValorCobrado(e.target.value)}
                  type="number" step="0.01" min="0" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Garantia (dias)</label>
                <input value={garantiaDias} onChange={(e) => setGarantiaDias(e.target.value)}
                  type="number" min="0" className={inputCls} />
              </div>
            </div>

            {parseFloat(valorCobrado) > 0 && (() => {
              const lucro = parseFloat(valorCobrado) - custoTotal
              return (
                <p className={`font-mono text-xs ${lucro >= 0 ? "text-[#22C55E]" : "text-[#FF4444]"}`}>
                  Lucro estimado: R$ {lucro.toFixed(2).replace(".", ",")}
                </p>
              )
            })()}

            {erroConcluir && <p className="text-xs text-[#FF4444]">{erroConcluir}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={concluirOS}
                disabled={salvando || !solucao.trim()}
                className="bg-[#E8FF47] text-black text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {salvando ? "Salvando..." : "Confirmar conclusão"}
              </button>
              <button
                onClick={() => setAbrirConcluir(false)}
                className="text-xs font-semibold uppercase tracking-widest text-[#555555] hover:text-white px-4 py-2 border border-[#1C1C1C] rounded-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog — Retorno de garantia */}
      <Dialog open={abrirRetorno} onOpenChange={setAbrirRetorno}>
        <DialogContent className="bg-[#111111] border-[#1C1C1C]">
          <DialogHeader>
            <DialogTitle className="text-[#F0F0F0] text-sm uppercase tracking-widest">
              Registrar retorno de garantia
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Descrição do problema *</label>
              <textarea
                value={descricaoRetorno}
                onChange={(e) => setDescricaoRetorno(e.target.value)}
                rows={3}
                placeholder="Descreva o que o cliente relatou..."
                className="w-full bg-[#0C0C0C] border border-[#1C1C1C] text-sm text-[#F0F0F0] px-3 py-2 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors placeholder:text-[#333333] resize-none"
              />
            </div>
            {erroRetorno && <p className="text-xs text-[#FF4444]">{erroRetorno}</p>}
            <div className="flex gap-2">
              <button
                onClick={enviarRetorno}
                disabled={salvandoRetorno || !descricaoRetorno.trim()}
                className="bg-[#E8FF47] text-black text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {salvandoRetorno ? "Salvando..." : "Confirmar"}
              </button>
              <button
                onClick={() => setAbrirRetorno(false)}
                className="text-xs font-semibold uppercase tracking-widest text-[#555555] hover:text-white px-4 py-2 border border-[#1C1C1C] rounded-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View de impressão — só aparece ao imprimir */}
      <OSPrint os={os} />

      {/* Dialog — Devolução */}
      <Dialog open={abrirDevolucao} onOpenChange={setAbrirDevolucao}>
        <DialogContent className="bg-[#111111] border-[#1C1C1C] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#F0F0F0] text-sm uppercase tracking-widest">
              Registrar devolução
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Tipo de devolução</label>
              <Select value={tipoDevolucao} onValueChange={(v) => setTipoDevolucao(v as "reembolso" | "substituicao")}>
                <SelectTrigger className="bg-[#0C0C0C] border-[#1C1C1C] text-[#F0F0F0] text-xs rounded-sm focus:ring-0 focus:border-[#E8FF47]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-[#1C1C1C]">
                  <SelectItem value="reembolso" className="text-[#F0F0F0] focus:bg-[#1C1C1C] text-xs">Reembolso</SelectItem>
                  <SelectItem value="substituicao" className="text-[#F0F0F0] focus:bg-[#1C1C1C] text-xs">Substituição de central</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className={labelCls}>Motivo *</label>
              <textarea
                value={motivoDevolucao}
                onChange={(e) => setMotivoDevolucao(e.target.value)}
                rows={2}
                placeholder="Motivo da devolução..."
                className="w-full bg-[#0C0C0C] border border-[#1C1C1C] text-sm text-[#F0F0F0] px-3 py-2 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors placeholder:text-[#333333] resize-none"
              />
            </div>

            {tipoDevolucao === "reembolso" && (
              <div>
                <label className={labelCls}>Valor reembolsado (R$)</label>
                <input value={valorReembolsado} onChange={(e) => setValorReembolsado(e.target.value)}
                  type="number" step="0.01" min="0" className={inputCls} />
              </div>
            )}

            {tipoDevolucao === "substituicao" && (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Central substituta</label>
                  <input value={centralAdquirida} onChange={(e) => setCentralAdquirida(e.target.value)}
                    placeholder="Ex: Bosch ME17 recondicionada" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Custo da central (R$)</label>
                    <input value={custoCentral} onChange={(e) => setCustoCentral(e.target.value)}
                      type="number" step="0.01" min="0" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Novo valor cobrado (R$)</label>
                    <input value={novoValorCobrado} onChange={(e) => setNovoValorCobrado(e.target.value)}
                      type="number" step="0.01" min="0" className={inputCls} />
                  </div>
                </div>
              </div>
            )}

            {erroDevolucao && <p className="text-xs text-[#FF4444]">{erroDevolucao}</p>}

            <div className="flex gap-2">
              <button
                onClick={enviarDevolucao}
                disabled={salvandoDevolucao || !motivoDevolucao.trim()}
                className="bg-[#E8FF47] text-black text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {salvandoDevolucao ? "Salvando..." : "Confirmar devolução"}
              </button>
              <button
                onClick={() => setAbrirDevolucao(false)}
                className="text-xs font-semibold uppercase tracking-widest text-[#555555] hover:text-white px-4 py-2 border border-[#1C1C1C] rounded-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
