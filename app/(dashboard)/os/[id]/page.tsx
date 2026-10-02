"use client"

import { useEffect, useState } from "react"
import { BlocoAudio } from "@/components/os/BlocoAudio"
import { DialogCancelarOS } from "@/components/os/DialogCancelarOS"
import { DialogRetornoGarantia } from "@/components/os/DialogRetornoGarantia"
import { DialogDevolucao } from "@/components/os/DialogDevolucao"
import { DialogConcluirOS } from "@/components/os/DialogConcluirOS"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { ArrowLeft, FileDown, Pencil } from "lucide-react"
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
  central_id: {
    _id: string
    marca?: string
    modelo?: string
    codigo?: string
    apelido?: string
    status_catalogo?: "rascunho" | "confirmada"
  } | null
  tecnico_id: { _id: string; nome: string } | null
  tipo_cliente?: "mecanico" | "usuario"
  tipo_os?: "reparo" | "teste"
  /** Legado: só URLs. A mídia nova vem em `midias`. */
  fotos: string[]
  midias?: {
    _id: string
    tipo: "foto" | "audio"
    papel?: "peca" | "defeito"
    url: string
    duracao_s?: number
    transcricao?: {
      status: "pendente" | "processando" | "concluida" | "falhou"
      texto?: string
      erro?: string
    }
  }[]
  defeito_transcrito?: string
  pago: boolean
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
  cancelada:     { label: "Cancelada",     cls: "bg-[#1A1A1A] text-[#B4B4B4]" },
}

const PODE_CANCELAR: OSStatus[] = ["aberta", "na_fila", "em_andamento"]

const inputCls = "w-full bg-[#0C0C0C] border border-[#1C1C1C] text-base text-[#F0F0F0] px-3 py-2 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors placeholder:text-[#8A8A8A]"
const labelCls = "block text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] mb-1"

export default function OSDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const [os, setOS] = useState<OS | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [abrirConcluir, setAbrirConcluir] = useState(false)

  const [atualizando, setAtualizando] = useState(false)

  const [abrirRetorno, setAbrirRetorno] = useState(false)


  const [abrirCancelar, setAbrirCancelar] = useState(false)

  const [abrirDevolucao, setAbrirDevolucao] = useState(false)

  async function carregar() {
    setCarregando(true)
    try {
      const res = await fetch(`/api/os/${id}`, { cache: "no-store" })
      if (!res.ok) { router.push("/os"); return }
      const data = await res.json()
      setOS(data)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [id])

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

  async function marcarComoPago() {
    if (atualizando) return
    setAtualizando(true)
    try {
      const res = await fetch(`/api/os/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pago: true }),
      })
      if (res.ok) carregar()
    } finally {
      setAtualizando(false)
    }
  }

  function exportarPDF() {
    window.print()
  }

  if (carregando) return <p className="text-sm uppercase tracking-wide text-[#B4B4B4]">Carregando...</p>
  if (!os) return null

  const badge = STATUS_BADGE[os.status] ?? STATUS_BADGE.aberta

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/os")}
          className="text-[#B4B4B4] hover:text-white transition-colors print:hidden"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-mono text-xl font-bold text-[#E8FF47]">OS #{os.numero_os}</h1>
            <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm ${badge.cls}`}>
              {badge.label}
            </span>
            {os.status === "concluida" && (
              <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm ${
                os.pago ? "bg-[#0D2A1A] text-[#22C55E]" : "bg-[#2A1500] text-[#F59E0B]"
              }`}>
                {os.pago ? "Pago" : "Pagamento pendente"}
              </span>
            )}
          </div>
          <p className="font-mono text-[12px] text-[#B4B4B4] mt-0.5">
            Aberta em {new Date(os.created_at).toLocaleDateString("pt-BR")}
            {os.closed_at && ` · Concluída em ${new Date(os.closed_at).toLocaleDateString("pt-BR")}`}
          </p>
        </div>
        <div className="print:hidden flex items-center gap-2">
          <button
            onClick={() => router.push(`/os/${id}/editar`)}
            className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] hover:text-white border border-[#1C1C1C] hover:border-[#2A2A2A] px-3 py-1.5 rounded-sm transition-colors"
          >
            <Pencil size={12} />
            Editar
          </button>
          {PODE_CANCELAR.includes(os.status) && (
            <button
              onClick={() => setAbrirCancelar(true)}
              className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] hover:text-[#FF4444] border border-[#1C1C1C] hover:border-[#2A0D0D] px-3 py-1.5 rounded-sm transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={exportarPDF}
            className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] hover:text-white border border-[#1C1C1C] hover:border-[#2A2A2A] px-3 py-1.5 rounded-sm transition-colors"
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
          className="bg-[#1E2A3A] text-[#60A5FA] text-sm font-bold uppercase tracking-wide px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-50 transition-all"
        >
          Colocar na fila
        </button>
      )}
      {os.status === "na_fila" && (
        <button
          onClick={() => atualizarStatus("em_andamento")}
          disabled={atualizando}
          className="bg-[#2A2000] text-[#F59E0B] text-sm font-bold uppercase tracking-wide px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-50 transition-all"
        >
          Iniciar serviço
        </button>
      )}
      {os.status === "em_andamento" && (
        <button
          onClick={() => setAbrirConcluir(true)}
          className="bg-[#E8FF47] text-black text-sm font-bold uppercase tracking-wide px-4 py-2 rounded-sm hover:brightness-110 transition-all"
        >
          Concluir OS
        </button>
      )}

      {/* Cards cliente + central */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] mb-2">Cliente</p>
          {os.cliente_id ? (
            <>
              <Link href={`/clientes/${os.cliente_id._id}`}
                className="text-base font-medium text-[#F0F0F0] hover:text-[#E8FF47] transition-colors">
                {os.cliente_id.nome}
              </Link>
              <p className="font-mono text-[12px] text-[#B4B4B4] mt-0.5">{os.cliente_id.telefone}</p>
            </>
          ) : (
            <p className="text-base text-[#B4B4B4]">—</p>
          )}
        </div>

        <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] mb-2">Central</p>
          {os.central_id ? (
            <>
              <Link href={`/centrais/${os.central_id._id}`}
                className="text-base font-medium text-[#F0F0F0] hover:text-[#E8FF47] transition-colors">
                {os.central_id.marca || os.central_id.modelo ? (
                  <>
                    {os.central_id.marca}{" "}
                    <span className="font-mono text-[#E8FF47]">{os.central_id.modelo}</span>
                  </>
                ) : (
                  os.central_id.apelido || "Peça sem identificação"
                )}
              </Link>
              {os.central_id.codigo && (
                <p className="font-mono text-[12px] text-[#B4B4B4] mt-0.5">{os.central_id.codigo}</p>
              )}
              {os.central_id.status_catalogo === "rascunho" && (
                <p className="text-[12px] font-bold uppercase tracking-wide text-[#F59E0B] mt-1">
                  a identificar
                </p>
              )}
            </>
          ) : (
            <p className="text-base text-[#B4B4B4]">—</p>
          )}
        </div>
      </div>

      {/* Defeito */}
      <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4]">Defeito relatado</p>
          <div className="flex items-center gap-1.5">
            {os.tipo_cliente && (
              <span className={`text-[12px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm ${
                os.tipo_cliente === "mecanico" ? "bg-[#1E2A3A] text-[#60A5FA]" : "bg-[#1C1C1C] text-[#888888]"
              }`}>
                {os.tipo_cliente === "mecanico" ? "Mecânico" : "Usuário"}
              </span>
            )}
            {os.tipo_os === "teste" && (
              <span className="text-[12px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm bg-[#2A2000] text-[#F59E0B]">
                Teste
              </span>
            )}
          </div>
        </div>
        <p className="text-base text-[#F0F0F0]">
          {os.defeito_descricao || os.defeito_transcrito || (
            <span className="text-[#B4B4B4]">Sem descrição escrita.</span>
          )}
        </p>
      </div>

      {/* Fotos: o array legado e as midias novas aparecem juntos */}
      {(() => {
        const urlsLegado = os.fotos ?? []
        const urlsMidia = (os.midias ?? []).filter((m) => m.tipo === "foto").map((m) => m.url)
        const todas = [...urlsLegado, ...urlsMidia]
        if (!todas.length) return null
        return (
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] mb-2">
              Fotos da peça
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {todas.map((url: string) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                  className="aspect-square bg-[#111111] rounded-sm overflow-hidden border border-[#1C1C1C] block hover:border-[#E8FF47] transition-colors">
                  <img src={url} alt="Foto da peça" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Audio: o componente cuida de transcrever e corrigir */}
      <BlocoAudio
        osId={id}
        midias={(os.midias ?? [])
          .filter((m) => m.tipo === "audio")
          .map((m) => ({
            _id: m._id,
            url: m.url,
            papel: m.papel,
            duracao_s: m.duracao_s,
            transcricao: m.transcricao as never,
          }))}
        onAtualizado={carregar}
      />

      {/* Cancelamento */}
      {os.status === "cancelada" && (
        <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] mb-2">OS Cancelada</p>
          <p className="text-base text-[#B4B4B4]">
            {os.motivo_cancelamento || "Sem motivo registrado."}
          </p>
        </div>
      )}

      {/* Solução */}
      {os.solucao_descricao && (
        <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#22C55E] mb-2">Solução aplicada</p>
          <p className="text-base text-[#F0F0F0]">{os.solucao_descricao}</p>
        </div>
      )}

      {/* Resultado financeiro */}
      {os.status === "concluida" && (
        <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] mb-3">Resultado</p>
          {os.tecnico_id && (
            <div className="flex justify-between text-sm mb-3">
              <span className="text-[#B4B4B4]">Técnico responsável</span>
              <span className="text-[#F0F0F0] font-medium">{os.tecnico_id.nome}</span>
            </div>
          )}
          {os.pecas.length > 0 && (
            <div className="mb-3 space-y-1">
              <p className="text-[11px] uppercase tracking-wide text-[#B4B4B4] mb-1">Peças</p>
              {os.pecas.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-[#F0F0F0]">{p.nome}</span>
                  <span className="font-mono text-[#B4B4B4]">R$ {p.custo.toFixed(2).replace(".", ",")}</span>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-[#1C1C1C] pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-[#B4B4B4]">Custo de peças</span>
              <span className="font-mono text-[#B4B4B4]">R$ {os.custo_total_pecas.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="flex justify-between text-base">
              <span className="text-[#B4B4B4]">Valor cobrado</span>
              <span className="font-mono font-medium text-[#F0F0F0]">R$ {os.valor_cobrado.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className={`flex justify-between text-base font-medium ${os.lucro_liquido >= 0 ? "text-[#22C55E]" : "text-[#FF4444]"}`}>
              <span>Lucro líquido</span>
              <span className="font-mono">R$ {os.lucro_liquido.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>
          {os.garantia_ate && (
            <p className="text-[12px] text-[#B4B4B4] mt-3">
              Garantia até {new Date(os.garantia_ate).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
      )}

      {/* Retornos de garantia */}
      {os.status === "concluida" && (
        <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4]">
              Retornos de garantia <span className="font-mono">{os.retornos_garantia.length}</span>
            </p>
            <button
              onClick={() => setAbrirRetorno(true)}
              className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] hover:text-white transition-colors"
            >
              + Registrar
            </button>
          </div>
          {os.retornos_garantia.length === 0 ? (
            <p className="text-[12px] text-[#8A8A8A]">Nenhum retorno registrado.</p>
          ) : (
            <div className="space-y-3">
              {os.retornos_garantia.map((r) => (
                <div key={r._id}>
                  <p className="text-base text-[#F0F0F0]">{r.descricao}</p>
                  <p className="font-mono text-[12px] text-[#B4B4B4]">{new Date(r.data).toLocaleDateString("pt-BR")}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Devolução registrada */}
      {os.devolucao && (
        <div className="bg-[#111111] border border-[#2A0D0D] rounded-sm p-4">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#FF4444] mb-3">
            {os.devolucao.tipo === "reembolso" ? "Devolução — Reembolso" : "Devolução — Substituição"}
          </p>
          <div className="space-y-1 text-base">
            <p className="text-[#F0F0F0]">{os.devolucao.motivo}</p>
            {os.devolucao.valor_reembolsado != null && (
              <p className="font-mono text-sm text-[#B4B4B4]">
                Reembolso: R$ {os.devolucao.valor_reembolsado.toFixed(2).replace(".", ",")}
              </p>
            )}
            {os.devolucao.central_adquirida && (
              <p className="text-sm text-[#B4B4B4]">Central substituta: {os.devolucao.central_adquirida}</p>
            )}
            <p className="font-mono text-[12px] text-[#B4B4B4]">
              {new Date(os.devolucao.data).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
      )}

      {/* Ações pós-conclusão */}
      {os.status === "concluida" && (
        <div className="flex flex-wrap gap-2">
          {!os.pago && (
            <button
              disabled={atualizando}
              onClick={marcarComoPago}
              className="text-[12px] font-bold uppercase tracking-wide text-[#F59E0B] hover:text-[#22C55E] border border-[#2A1500] hover:border-[#0D2A1A] px-4 py-2 rounded-sm transition-colors disabled:opacity-50"
            >
              Marcar como pago
            </button>
          )}
          {!os.devolucao && (
            <button
              onClick={() => setAbrirDevolucao(true)}
              className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] hover:text-[#FF4444] border border-[#1C1C1C] hover:border-[#2A0D0D] px-4 py-2 rounded-sm transition-colors"
            >
              Registrar devolução
            </button>
          )}
        </div>
      )}

      <DialogCancelarOS
        osId={id}
        numeroOS={os.numero_os}
        aberto={abrirCancelar}
        onFechar={() => setAbrirCancelar(false)}
        onSucesso={carregar}
      />

      <DialogConcluirOS
        osId={id}
        numeroOS={os.numero_os}
        aberto={abrirConcluir}
        onFechar={() => setAbrirConcluir(false)}
        onSucesso={carregar}
      />

      <DialogRetornoGarantia
        osId={id}
        aberto={abrirRetorno}
        onFechar={() => setAbrirRetorno(false)}
        onSucesso={carregar}
      />

      {/* View de impressão — só aparece ao imprimir */}
      <OSPrint os={os} />

      <DialogDevolucao
        osId={id}
        aberto={abrirDevolucao}
        onFechar={() => setAbrirDevolucao(false)}
        onSucesso={carregar}
      />
    </div>
  )
}
