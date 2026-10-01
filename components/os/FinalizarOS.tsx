"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, X, DollarSign } from "lucide-react"

type Props = {
  osId: string
  numeroOS: number
  aberto: boolean
  onFechar: () => void
  onConcluido: () => void
}

const moeda = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`

/**
 * Fechar a OS em três toques: serviço, valor, concluir.
 *
 * Os chips vêm do histórico real do laboratório (`/api/os/sugestoes`), não de
 * uma lista no código — então melhoram com o uso em vez de envelhecer.
 *
 * Toda a conta (lucro, garantia, data de fechamento, comissão) continua no
 * `atualizarOS`/`PUT /api/os/[id]` que já existia. Aqui só se escolhe o quê.
 */
export function FinalizarOS({ osId, numeroOS, aberto, onFechar, onConcluido }: Props) {
  const [servicos, setServicos] = useState<string[]>([])
  const [valores, setValores] = useState<number[]>([])

  const [servico, setServico] = useState("")
  const [valor, setValor] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState("")

  useEffect(() => {
    if (!aberto) return
    fetch("/api/os/sugestoes")
      .then((r) => (r.ok ? r.json() : { servicos: [], valores: [] }))
      .then((d) => {
        setServicos(d.servicos ?? [])
        setValores(d.valores ?? [])
      })
      .catch(() => {})
  }, [aberto])

  if (!aberto) return null

  const valorNumero = Number(valor.replace(",", "."))
  const podeConcluir = servico.trim().length > 0 && valorNumero > 0 && !enviando

  async function concluir(pago: boolean) {
    if (!podeConcluir) return
    setEnviando(true)
    setErro("")
    try {
      const res = await fetch(`/api/os/${osId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "concluida",
          servico_tag: servico.trim(),
          solucao_descricao: servico.trim(),
          valor_cobrado: valorNumero,
          pago,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setErro(d?.error ?? "Não deu para concluir")
        return
      }
      onConcluido()
      onFechar()
    } catch {
      setErro("Sem conexão")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onFechar}
        className="absolute inset-0 bg-black/70"
      />

      <div className="relative w-full sm:max-w-md bg-[#0C0C0C] border-t sm:border border-[#1C1C1C] rounded-t-sm sm:rounded-sm p-5 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold uppercase tracking-wide text-[#F0F0F0]">
            Finalizar OS #{numeroOS}
          </h2>
          <button type="button" onClick={onFechar} className="p-1 text-[#B4B4B4] hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4]">
            Que serviço foi feito
          </p>
          {servicos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {servicos.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setServico(s)}
                  className={`px-4 py-3 rounded-sm text-base font-bold border transition-colors ${
                    servico === s
                      ? "bg-[#E8FF47] text-black border-[#E8FF47]"
                      : "bg-[#111111] text-[#F0F0F0] border-[#1C1C1C] hover:border-[#B4B4B4]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <input
            value={servico}
            onChange={(e) => setServico(e.target.value)}
            placeholder={servicos.length ? "ou escreva outro" : "ex: reparo de ECU"}
            className="w-full bg-[#111111] border border-[#1C1C1C] text-base text-[#F0F0F0] px-4 py-3 rounded-sm focus:outline-none focus:border-[#E8FF47] placeholder:text-[#8A8A8A]"
          />
        </div>

        <div className="space-y-2">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4]">Quanto</p>
          {valores.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {valores.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setValor(String(v))}
                  className={`px-4 py-3 rounded-sm text-base font-bold font-mono border transition-colors ${
                    valorNumero === v
                      ? "bg-[#E8FF47] text-black border-[#E8FF47]"
                      : "bg-[#111111] text-[#F0F0F0] border-[#1C1C1C] hover:border-[#B4B4B4]"
                  }`}
                >
                  {moeda(v)}
                </button>
              ))}
            </div>
          )}
          <div className="relative">
            <DollarSign
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B4B4B4]"
            />
            <input
              value={valor}
              onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ""))}
              placeholder={valores.length ? "ou outro valor" : "150"}
              inputMode="decimal"
              className="w-full bg-[#111111] border border-[#1C1C1C] text-base font-mono text-[#F0F0F0] pl-10 pr-4 py-3 rounded-sm focus:outline-none focus:border-[#E8FF47] placeholder:text-[#8A8A8A]"
            />
          </div>
        </div>

        {erro && (
          <p className="text-base font-bold text-[#FF4444] bg-[#2A0D0D] border border-[#FF4444]/40 px-4 py-3 rounded-sm">
            {erro}
          </p>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => concluir(true)}
            disabled={!podeConcluir}
            className="w-full flex items-center justify-center gap-3 bg-[#E8FF47] text-black py-5 rounded-sm text-base font-bold uppercase tracking-wide disabled:opacity-40 active:brightness-90"
          >
            {enviando ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
            Concluir e marcar pago
          </button>
          <button
            type="button"
            onClick={() => concluir(false)}
            disabled={!podeConcluir}
            className="w-full py-4 rounded-sm text-base font-bold uppercase tracking-wide text-[#B4B4B4] border border-[#1C1C1C] hover:text-white hover:border-[#B4B4B4] disabled:opacity-40"
          >
            Concluir sem pagar ainda
          </button>
        </div>
      </div>
    </div>
  )
}
