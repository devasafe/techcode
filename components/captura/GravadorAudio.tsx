"use client"

import { useEffect, useRef, useState } from "react"
import { Mic, Square, Trash2, Keyboard } from "lucide-react"
import {
  gravacaoSuportada,
  escolherMimeType,
  extensaoDoMime,
  formatarDuracao,
  DURACAO_MAXIMA_S,
} from "@/lib/audio"

type Props = {
  audio: File | null
  onChange: (audio: File | null) => void
  /** Chamado quando o aparelho não grava: a tela cai para texto digitado. */
  onPrecisaDigitar: () => void
  desabilitado?: boolean
}

export function GravadorAudio({ audio, onChange, onPrecisaDigitar, desabilitado }: Props) {
  const [gravando, setGravando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [nivel, setNivel] = useState(0)
  const [erro, setErro] = useState("")

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => encerrarTudo()
  }, [])

  function encerrarTudo() {
    if (timerRef.current) clearInterval(timerRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    analyserRef.current = null
  }

  function medirNivel(stream: MediaStream) {
    try {
      const ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      src.connect(analyser)
      analyserRef.current = analyser
      const dados = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        if (!analyserRef.current) return
        analyser.getByteFrequencyData(dados)
        const media = dados.reduce((a, b) => a + b, 0) / dados.length
        setNivel(Math.min(1, media / 90))
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      // Sem medidor de nível a gravação continua funcionando.
    }
  }

  function pararGravacao() {
    if (timerRef.current) clearInterval(timerRef.current)
    try {
      recorderRef.current?.stop()
    } catch {
      encerrarTudo()
      setGravando(false)
    }
  }

  async function iniciar() {
    setErro("")
    if (!gravacaoSuportada()) {
      onPrecisaDigitar()
      return
    }
    try {
      // getUserMedia tem de ser chamado dentro do gesto do usuário (exigência do iOS).
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = escolherMimeType()
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = rec
      const pedacos: Blob[] = []

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) pedacos.push(e.data)
      }
      rec.onstop = () => {
        // O mimeType real pode diferir do pedido; usamos o que o aparelho deu.
        const tipo = rec.mimeType || mimeType || "audio/webm"
        const blob = new Blob(pedacos, { type: tipo })
        if (blob.size > 0) {
          onChange(new File([blob], `defeito.${extensaoDoMime(tipo)}`, { type: tipo }))
        }
        encerrarTudo()
        setGravando(false)
        setNivel(0)
      }

      medirNivel(stream)
      rec.start()
      setGravando(true)
      setSegundos(0)
      timerRef.current = setInterval(() => {
        setSegundos((s) => {
          if (s + 1 >= DURACAO_MAXIMA_S) {
            pararGravacao()
            return DURACAO_MAXIMA_S
          }
          return s + 1
        })
      }, 1000)
    } catch {
      // Permissão negada ou microfone ocupado: não insistir, oferecer texto.
      setErro("Não deu para usar o microfone")
      encerrarTudo()
      setGravando(false)
      onPrecisaDigitar()
    }
  }

  if (audio) {
    return (
      <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4]">
            Áudio gravado
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex items-center gap-2 text-sm text-[#FF4444] font-bold"
          >
            <Trash2 size={16} /> Apagar
          </button>
        </div>
        <audio controls src={URL.createObjectURL(audio)} className="w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={gravando ? pararGravacao : iniciar}
        disabled={desabilitado}
        className={`w-full flex items-center justify-center gap-3 py-5 rounded-sm text-base font-bold uppercase tracking-wide transition-colors disabled:opacity-50 border ${
          gravando
            ? "bg-[#2A0D0D] border-[#FF4444] text-[#FF4444]"
            : "bg-[#111111] border-[#1C1C1C] text-[#F0F0F0] hover:border-[#B4B4B4] active:bg-[#1A1A1A]"
        }`}
      >
        {gravando ? <Square size={20} /> : <Mic size={22} className="text-[#E8FF47]" />}
        {gravando ? `Parar — ${formatarDuracao(segundos)}` : "Gravar descrição"}
      </button>

      {gravando && (
        <div className="h-1.5 bg-[#1C1C1C] rounded-sm overflow-hidden">
          <div
            className="h-full bg-[#E8FF47] transition-[width] duration-100"
            style={{ width: `${Math.round(nivel * 100)}%` }}
          />
        </div>
      )}

      {erro && <p className="text-sm text-[#FF4444]">{erro}</p>}

      {!gravando && (
        <button
          type="button"
          onClick={onPrecisaDigitar}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold text-[#B4B4B4] hover:text-white"
        >
          <Keyboard size={16} /> prefiro digitar
        </button>
      )}
    </div>
  )
}
