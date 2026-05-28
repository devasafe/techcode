"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CentralForm } from "@/components/centrais/CentralForm"
import { ArrowLeft, Pencil, Wrench, Upload, Trash2, FileText, Image, File, Loader2, ExternalLink, X } from "lucide-react"

type Arquivo = {
  _id: string
  nome: string
  url: string
  public_id: string
  tipo: "imagem" | "pdf" | "outro"
  tamanho: number
  created_at: string
}

type Central = {
  _id: string
  marca: string
  modelo: string
  codigo: string
  descricao?: string
  arquivos: Arquivo[]
}

type Reparo = {
  _id: string
  numero_os: number
  defeito_descricao: string
  solucao_descricao?: string
  closed_at: string
  cliente_id: { nome: string } | null
}

function IconeArquivo({ tipo }: { tipo: Arquivo["tipo"] }) {
  if (tipo === "imagem") return <Image size={14} className="text-[#60A5FA]" />
  if (tipo === "pdf") return <FileText size={14} className="text-[#FF4444]" />
  return <File size={14} className="text-[#555555]" />
}

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function CentralDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [central, setCentral] = useState<Central | null>(null)
  const [reparos, setReparos] = useState<Reparo[]>([])
  const [editando, setEditando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [uploadando, setUploadando] = useState(false)
  const [removendo, setRemovendo] = useState<string | null>(null)
  const inputArquivoRef = useRef<HTMLInputElement>(null)
  const inputFotoRef = useRef<HTMLInputElement>(null)

  async function carregar() {
    setCarregando(true)
    try {
      const [resCentral, resReparos] = await Promise.all([
        fetch(`/api/centrais/${id}`),
        fetch(`/api/centrais/${id}/reparos`),
      ])
      if (!resCentral.ok) { router.push("/centrais"); return }
      const [dadosCentral, dadosReparos] = await Promise.all([
        resCentral.json(),
        resReparos.ok ? resReparos.json() : [],
      ])
      setCentral(dadosCentral)
      setReparos(dadosReparos)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [id])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo || !central) return
    setUploadando(true)
    try {
      const form = new FormData()
      form.append("arquivo", arquivo)
      const res = await fetch(`/api/centrais/${id}/arquivos`, { method: "POST", body: form })
      if (res.ok) {
        const data = await res.json()
        setCentral((prev) => prev ? { ...prev, arquivos: data.arquivos } : prev)
      }
    } finally {
      setUploadando(false)
      if (inputArquivoRef.current) inputArquivoRef.current.value = ""
      if (inputFotoRef.current) inputFotoRef.current.value = ""
    }
  }

  async function handleRemover(arq: Arquivo) {
    setRemovendo(arq._id)
    try {
      const res = await fetch(`/api/centrais/${id}/arquivos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arquivo_id: arq._id, public_id: arq.public_id, tipo: arq.tipo }),
      })
      if (res.ok) {
        const data = await res.json()
        setCentral((prev) => prev ? { ...prev, arquivos: data.arquivos } : prev)
      }
    } finally {
      setRemovendo(null)
    }
  }

  if (carregando) return <p className="text-xs uppercase tracking-widest text-[#555555]">Carregando...</p>
  if (!central) return null

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/centrais")} className="text-[#555555] hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-semibold uppercase tracking-widest text-[#F0F0F0]">
            {central.marca} <span className="font-mono text-[#E8FF47]">{central.modelo}</span>
          </h1>
          <p className="font-mono text-[10px] text-[#555555] mt-0.5">{central.codigo}</p>
        </div>
        <button
          onClick={() => setEditando(true)}
          className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#555555] hover:text-white transition-colors"
        >
          <Pencil size={12} />
          Editar
        </button>
      </div>

      {central.descricao && (
        <p className="text-sm text-[#555555]">{central.descricao}</p>
      )}

      <input ref={inputFotoRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      <input ref={inputArquivoRef} type="file" accept=".pdf,.zip,.rar,.txt,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleUpload} />

      {/* Fotos */}
      {(() => {
        const fotos = central.arquivos.filter((a) => a.tipo === "imagem")
        return (
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1C1C1C]">
              <div className="flex items-center gap-2">
                <Image size={12} className="text-[#555555]" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#555555]">Fotos</span>
                {fotos.length > 0 && (
                  <span className="font-mono text-xs text-[#555555]">{fotos.length}</span>
                )}
              </div>
              <button
                onClick={() => inputFotoRef.current?.click()}
                disabled={uploadando}
                className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#555555] hover:text-white transition-colors disabled:opacity-50"
              >
                {uploadando ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                {uploadando ? "Enviando..." : "Adicionar"}
              </button>
            </div>
            {fotos.length === 0 ? (
              <div className="border border-dashed border-[#1C1C1C] rounded-sm p-6 text-center">
                <p className="text-xs text-[#555555]">Nenhuma foto adicionada.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {fotos.map((arq) => (
                  <div key={arq._id} className="relative group aspect-square bg-[#111111] rounded-sm overflow-hidden border border-[#1C1C1C]">
                    <a href={arq.url} target="_blank" rel="noopener noreferrer">
                      <img src={arq.url} alt={arq.nome} className="w-full h-full object-cover" />
                    </a>
                    <button
                      onClick={() => handleRemover(arq)}
                      disabled={removendo === arq._id}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    >
                      {removendo === arq._id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Arquivos */}
      {(() => {
        const docs = central.arquivos.filter((a) => a.tipo !== "imagem")
        return (
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1C1C1C]">
              <div className="flex items-center gap-2">
                <File size={12} className="text-[#555555]" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#555555]">Arquivos</span>
                {docs.length > 0 && (
                  <span className="font-mono text-xs text-[#555555]">{docs.length}</span>
                )}
              </div>
              <button
                onClick={() => inputArquivoRef.current?.click()}
                disabled={uploadando}
                className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#555555] hover:text-white transition-colors disabled:opacity-50"
              >
                {uploadando ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                {uploadando ? "Enviando..." : "Adicionar"}
              </button>
            </div>
            {docs.length === 0 ? (
              <div className="border border-dashed border-[#1C1C1C] rounded-sm p-6 text-center">
                <p className="text-xs text-[#555555]">Nenhum arquivo adicionado.</p>
                <p className="text-[10px] text-[#333333] mt-1">Manuais, esquemas elétricos, PDFs...</p>
              </div>
            ) : (
              <div className="space-y-1">
                {docs.map((arq) => (
                  <div key={arq._id} className="flex items-center gap-3 bg-[#111111] border border-[#1C1C1C] rounded-sm px-3 py-2.5 group">
                    <IconeArquivo tipo={arq.tipo} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#F0F0F0] truncate">{arq.nome}</p>
                      <p className="text-[10px] text-[#555555]">
                        {formatarTamanho(arq.tamanho)} · {new Date(arq.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={arq.url} target="_blank" rel="noopener noreferrer" className="text-[#555555] hover:text-white transition-colors">
                        <ExternalLink size={12} />
                      </a>
                      <button
                        onClick={() => handleRemover(arq)}
                        disabled={removendo === arq._id}
                        className="text-[#555555] hover:text-[#FF4444] transition-colors disabled:opacity-50"
                      >
                        {removendo === arq._id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Base de Conhecimento */}
      <div>
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1C1C1C]">
          <Wrench size={12} className="text-[#555555]" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#555555]">Base de Conhecimento</span>
          {reparos.length > 0 && (
            <span className="font-mono text-xs text-[#555555]">{reparos.length}</span>
          )}
        </div>

        <div className="space-y-3">
          {reparos.map((r) => (
            <div
              key={r._id}
              onClick={() => router.push(`/os/${r._id}`)}
              className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4 cursor-pointer hover:border-[#2A2A2A] hover:bg-[#141414] transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#E8FF47]">#{r.numero_os}</span>
                  {r.cliente_id && (
                    <span className="text-xs text-[#555555]">— {r.cliente_id.nome}</span>
                  )}
                </div>
                {r.closed_at && (
                  <span className="font-mono text-[10px] text-[#555555]">
                    {new Date(r.closed_at).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-[#555555] mb-0.5">Defeito</p>
                  <p className="text-sm text-[#F0F0F0]">{r.defeito_descricao}</p>
                </div>
                {r.solucao_descricao && (
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-[#22C55E] mb-0.5">Solução</p>
                    <p className="text-sm text-[#F0F0F0]">{r.solucao_descricao}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
          {reparos.length === 0 && (
            <div className="border border-dashed border-[#1C1C1C] rounded-sm p-8 text-center">
              <p className="text-xs text-[#555555]">Nenhum reparo concluído registrado para este modelo.</p>
              <p className="text-[10px] text-[#333333] mt-1">Reparos aparecerão aqui quando OS forem concluídas.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="bg-[#111111] border-[#1C1C1C]">
          <DialogHeader>
            <DialogTitle className="text-[#F0F0F0] text-sm uppercase tracking-widest">Editar central</DialogTitle>
          </DialogHeader>
          <CentralForm
            central={central}
            onSalvo={() => { setEditando(false); carregar() }}
            onCancelar={() => setEditando(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
