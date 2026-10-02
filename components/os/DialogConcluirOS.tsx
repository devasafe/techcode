"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const labelCls = "block text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] mb-1.5"
const inputCls =
  "w-full bg-[#0C0C0C] border border-[#1C1C1C] text-base text-[#F0F0F0] px-3 py-2 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors placeholder:text-[#8A8A8A]"

type Peca = { nome: string; custo: number }
type Tecnico = { _id: string; nome: string; comissao_pct: number }

type Props = {
  osId: string
  numeroOS: number
  aberto: boolean
  onFechar: () => void
  onSucesso: () => void
}

/**
 * Conclusão completa da OS: solução, peças, valor, garantia e técnico.
 *
 * Extraído de `os/[id]/page.tsx` (que tinha 969 linhas). Carregou consigo 10
 * estados e a busca de técnicos, que só serviam a este diálogo.
 *
 * Toda a conta continua no backend (`atualizarOS` recalcula lucro, garantia e
 * comissão) — aqui só se escolhe. O caminho rápido de 3 toques vive em
 * `FinalizarOS`, usado na fila; este é o completo, para quando há peças e
 * garantia a registrar.
 */
export function DialogConcluirOS({ osId, numeroOS, aberto, onFechar, onSucesso }: Props) {
  const { data: session } = useSession()

  const [solucao, setSolucao] = useState("")
  const [valorCobrado, setValorCobrado] = useState("0")
  const [garantiaDias, setGarantiaDias] = useState("90")
  const [pecas, setPecas] = useState<Peca[]>([])
  const [nomePeca, setNomePeca] = useState("")
  const [custoPeca, setCustoPeca] = useState("")
  const [centralEmBomEstado, setCentralEmBomEstado] = useState(false)
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [tecnicoId, setTecnicoId] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  const custoTotal = pecas.reduce((s, p) => s + p.custo, 0)

  // Técnico logado já vem selecionado, para ele não precisar escolher a si mesmo.
  useEffect(() => {
    fetch("/api/usuarios")
      .then((r) => (r.ok ? r.json() : []))
      .then((lista: { _id: string; nome: string; perfis: string[]; comissao_pct: number }[]) => {
        const soTecnicos = lista.filter((u) => u.perfis.includes("tecnico"))
        setTecnicos(soTecnicos)
        if (session?.user?.perfis?.includes("tecnico") && session.user.id) {
          if (soTecnicos.some((t) => t._id === session.user.id)) setTecnicoId(session.user.id)
        }
      })
      .catch(() => {})
  }, [session])

  function adicionarPeca() {
    if (!nomePeca.trim() || !custoPeca) return
    setPecas((prev) => [...prev, { nome: nomePeca.trim(), custo: parseFloat(custoPeca) || 0 }])
    setNomePeca("")
    setCustoPeca("")
  }

  async function concluir() {
    setErro("")
    setSalvando(true)
    try {
      const res = await fetch(`/api/os/${osId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "concluida",
          // "Central em bom estado" é o que classifica a OS como teste.
          tipo_os: centralEmBomEstado ? "teste" : "reparo",
          solucao_descricao: solucao,
          pecas,
          valor_cobrado: parseFloat(valorCobrado) || 0,
          garantia_dias: parseInt(garantiaDias) || 0,
          ...(tecnicoId && { tecnico_id: tecnicoId }),
        }),
      })
      if (!res.ok) {
        let data: { error?: string } = {}
        try {
          data = await res.json()
        } catch {
          /* corpo não-JSON */
        }
        setErro(data.error ?? "Erro ao concluir OS.")
        return
      }
      onFechar()
      onSucesso()
    } catch {
      setErro("Erro de conexão. Tente novamente.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className="bg-[#111111] border-[#1C1C1C] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#F0F0F0] text-base uppercase tracking-wide">
            Concluir OS #{numeroOS}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              const proximo = !centralEmBomEstado
              setCentralEmBomEstado(proximo)
              if (proximo) setSolucao("Central testada — em bom estado, sem defeito identificado.")
              else setSolucao("")
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm border text-left transition-colors ${
              centralEmBomEstado
                ? "border-[#22C55E] bg-[#0D2A1A]"
                : "border-[#1C1C1C] bg-[#0C0C0C] hover:border-[#2A2A2A]"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
                centralEmBomEstado ? "border-[#22C55E] bg-[#22C55E]" : "border-[#B4B4B4]"
              }`}
            >
              {centralEmBomEstado && (
                <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
                  <path
                    d="M1 4l3 3 5-6"
                    stroke="#000"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <div>
              <p
                className={`text-sm font-semibold ${
                  centralEmBomEstado ? "text-[#22C55E]" : "text-[#F0F0F0]"
                }`}
              >
                Central em bom estado
              </p>
              <p className="text-[12px] text-[#B4B4B4]">
                Nenhum defeito encontrado — apenas teste
              </p>
            </div>
          </button>

          {tecnicos.length > 0 && (
            <div>
              <label className={labelCls}>Técnico responsável</label>
              <Select value={tecnicoId} onValueChange={(v) => setTecnicoId(v ?? "")}>
                <SelectTrigger className="bg-[#0C0C0C] border-[#1C1C1C] text-[#F0F0F0] text-sm rounded-sm focus:ring-0 focus:border-[#E8FF47]">
                  <SelectValue placeholder="Sem técnico (sem comissão)" />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-[#1C1C1C]">
                  {tecnicos.map((t) => (
                    <SelectItem
                      key={t._id}
                      value={t._id}
                      className="text-[#F0F0F0] focus:bg-[#1C1C1C] text-sm"
                    >
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
              className="w-full bg-[#0C0C0C] border border-[#1C1C1C] text-base text-[#F0F0F0] px-3 py-2 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors placeholder:text-[#8A8A8A] resize-none"
            />
          </div>

          {!centralEmBomEstado && (
            <div>
              <label className={labelCls}>Peças utilizadas</label>
              <div className="space-y-1.5 mb-2">
                {pecas.map((p, i) => (
                  <div
                    key={`${p.nome}-${i}`}
                    className="flex items-center gap-2 text-sm bg-[#0C0C0C] border border-[#1C1C1C] px-3 py-1.5 rounded-sm"
                  >
                    <span className="flex-1 text-[#F0F0F0]">{p.nome}</span>
                    <span className="font-mono text-[#B4B4B4]">
                      R$ {p.custo.toFixed(2).replace(".", ",")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPecas(pecas.filter((_, idx) => idx !== i))}
                    >
                      <Trash2
                        size={12}
                        className="text-[#B4B4B4] hover:text-[#FF4444] transition-colors"
                      />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={nomePeca}
                  onChange={(e) => setNomePeca(e.target.value)}
                  placeholder="Nome da peça"
                  className={`${inputCls} flex-1`}
                />
                <input
                  value={custoPeca}
                  onChange={(e) => setCustoPeca(e.target.value)}
                  placeholder="R$"
                  type="number"
                  step="0.01"
                  min="0"
                  className={`${inputCls} w-24`}
                />
                <button
                  type="button"
                  onClick={adicionarPeca}
                  className="bg-[#1C1C1C] text-[#F0F0F0] text-sm font-semibold px-3 py-2 rounded-sm hover:bg-[#2A2A2A] transition-colors"
                >
                  +
                </button>
              </div>
              {pecas.length > 0 && (
                <p className="font-mono text-[12px] text-[#B4B4B4] mt-1">
                  Total: R$ {custoTotal.toFixed(2).replace(".", ",")}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Valor cobrado (R$) *</label>
              <input
                value={valorCobrado}
                onChange={(e) => setValorCobrado(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Garantia (dias)</label>
              <input
                value={garantiaDias}
                onChange={(e) => setGarantiaDias(e.target.value)}
                type="number"
                min="0"
                className={inputCls}
              />
            </div>
          </div>

          {parseFloat(valorCobrado) > 0 &&
            (() => {
              const lucro = parseFloat(valorCobrado) - custoTotal
              return (
                <p
                  className={`font-mono text-sm ${
                    lucro >= 0 ? "text-[#22C55E]" : "text-[#FF4444]"
                  }`}
                >
                  Lucro estimado: R$ {lucro.toFixed(2).replace(".", ",")}
                </p>
              )
            })()}

          {erro && <p className="text-sm text-[#FF4444]">{erro}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={concluir}
              disabled={salvando || !solucao.trim()}
              className="bg-[#E8FF47] text-black text-sm font-bold uppercase tracking-wide px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {salvando ? "Salvando..." : "Confirmar conclusão"}
            </button>
            <button
              onClick={onFechar}
              className="text-sm font-bold uppercase tracking-wide text-[#B4B4B4] hover:text-white px-4 py-2 border border-[#1C1C1C] rounded-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
