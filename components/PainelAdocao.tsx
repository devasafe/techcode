"use client"

import { useEffect, useState } from "react"
import { Activity } from "lucide-react"

type Adocao = {
  dias: number
  por_dia: { dia: string; n: number }[]
  por_usuario: { nome: string; n: number }[]
  total: number
  media_por_dia: number
  com_foto: number
  com_audio: number
  com_audio_peca: number
  com_defeito_escrito: number
  via_entrada_rapida: number
  a_identificar: number
}

/**
 * Painel de adoção, visível só para admin.
 *
 * A v1 deste sistema foi abandonada e o motivo declarado foi fricção. Isso é
 * hipótese, não medida. Este bloco existe para transformar "acho que estão
 * usando" em número — e para mostrar se estão usando a ENTRADA NOVA ou se
 * voltaram ao formulário antigo, que é a pergunta que realmente importa.
 */
export function PainelAdocao() {
  const [dados, setDados] = useState<Adocao | null>(null)

  useEffect(() => {
    fetch("/api/adocao")
      // 403 para quem não é admin: simplesmente não mostra o bloco.
      .then((r) => (r.ok ? r.json() : null))
      .then(setDados)
      .catch(() => {})
  }, [])

  if (!dados || dados.total === 0) return null

  const pct = (n: number) => (dados.total ? Math.round((n / dados.total) * 100) : 0)
  const maior = Math.max(...dados.por_dia.map((d) => d.n), 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity size={16} className="text-[#E8FF47]" />
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#F0F0F0]">
          Uso nos últimos {dados.dias} dias
        </h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Kpi rotulo="Entradas" valor={String(dados.total)} destaque />
        <Kpi rotulo="Por dia" valor={String(dados.media_por_dia)} />
        <Kpi rotulo="Pela tela nova" valor={`${pct(dados.via_entrada_rapida)}%`} />
        <Kpi rotulo="A identificar" valor={String(dados.a_identificar)} alerta={dados.a_identificar > 10} />
      </div>

      {/* Barras simples: o que importa é ver se tem movimento todo dia ou se parou. */}
      <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4">
        <div className="flex items-end gap-1 h-24">
          {dados.por_dia.map((d) => (
            <div key={d.dia} className="flex-1 flex flex-col items-center justify-end gap-1">
              <span className="font-mono text-[11px] text-[#B4B4B4]">{d.n || ""}</span>
              <div
                className="w-full bg-[#E8FF47] rounded-sm min-h-[2px]"
                style={{ height: `${Math.round((d.n / maior) * 100)}%` }}
                title={`${d.dia}: ${d.n}`}
              />
              <span className="font-mono text-[11px] text-[#B4B4B4]">
                {d.dia.slice(8, 10)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4 space-y-2">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4]">
            O que a bancada está usando
          </p>
          <Linha rotulo="com foto" pct={pct(dados.com_foto)} n={dados.com_foto} />
          <Linha rotulo="com áudio" pct={pct(dados.com_audio)} n={dados.com_audio} />
          <Linha rotulo="áudio da peça" pct={pct(dados.com_audio_peca)} n={dados.com_audio_peca} />
          <Linha
            rotulo="defeito digitado"
            pct={pct(dados.com_defeito_escrito)}
            n={dados.com_defeito_escrito}
          />
        </div>

        {dados.por_usuario.length > 0 && (
          <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4 space-y-2">
            <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4]">
              Quem registrou
            </p>
            {dados.por_usuario.map((u) => (
              <div key={u.nome} className="flex items-center justify-between">
                <span className="text-base text-[#F0F0F0]">{u.nome}</span>
                <span className="font-mono text-base font-bold text-[#E8FF47]">{u.n}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Kpi({
  rotulo,
  valor,
  destaque,
  alerta,
}: {
  rotulo: string
  valor: string
  destaque?: boolean
  alerta?: boolean
}) {
  return (
    <div className="bg-[#111111] border border-[#1C1C1C] p-4 rounded-sm min-h-24 flex flex-col justify-between">
      <span className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4]">{rotulo}</span>
      <span
        className={`font-mono text-3xl font-bold ${
          alerta ? "text-[#F59E0B]" : destaque ? "text-[#E8FF47]" : "text-[#F0F0F0]"
        }`}
      >
        {valor}
      </span>
    </div>
  )
}

function Linha({ rotulo, pct, n }: { rotulo: string; pct: number; n: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#F0F0F0]">{rotulo}</span>
        <span className="font-mono text-sm text-[#B4B4B4]">
          {n} · {pct}%
        </span>
      </div>
      <div className="h-1.5 bg-[#1C1C1C] rounded-sm overflow-hidden">
        <div className="h-full bg-[#B4B4B4] rounded-sm" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
