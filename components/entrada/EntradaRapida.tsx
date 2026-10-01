"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Cpu } from "lucide-react"
import { CapturaFoto } from "@/components/captura/CapturaFoto"
import { GravadorAudio } from "@/components/captura/GravadorAudio"
import { SeletorOficina, type ClienteResumo } from "@/components/entrada/SeletorOficina"

export function EntradaRapida() {
  const router = useRouter()

  const [cliente, setCliente] = useState<ClienteResumo | null>(null)
  const [telefoneNovo, setTelefoneNovo] = useState<string | null>(null)
  const [fotos, setFotos] = useState<File[]>([])
  const [audio, setAudio] = useState<File | null>(null)
  const [digitarDefeito, setDigitarDefeito] = useState(false)
  const [defeito, setDefeito] = useState("")
  const [apelidoPeca, setApelidoPeca] = useState("")
  const [mostrarApelido, setMostrarApelido] = useState(false)

  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState("")

  // Gerada uma vez por formulário: é o que faz duplo toque ou retry em wifi ruim
  // não criarem duas OS.
  const chaveRef = useRef<string>(gerarChave())

  const podeEnviar = Boolean(cliente) && !enviando

  async function enviar() {
    if (!cliente) {
      setErro("Escolha a oficina")
      return
    }
    setEnviando(true)
    setErro("")

    const form = new FormData()
    form.set("chave_idempotencia", chaveRef.current)
    if (cliente._id) form.set("cliente_id", cliente._id)
    else if (telefoneNovo) form.set("telefone", telefoneNovo)
    if (defeito.trim()) form.set("defeito", defeito.trim())
    if (apelidoPeca.trim()) form.set("apelido_peca", apelidoPeca.trim())
    for (const f of fotos) form.append("foto", f)
    if (audio) {
      form.set("audio", audio)
      // O tipo real varia por plataforma; o servidor guarda o que veio.
      form.set("audio_mime", audio.type)
    }

    try {
      const res = await fetch("/api/entrada", { method: "POST", body: form })
      const dados = await res.json()
      if (!res.ok) {
        setErro(dados?.error ?? "Não deu para registrar")
        setEnviando(false)
        return
      }
      router.push(`/os/${dados._id}`)
    } catch {
      setErro("Sem conexão. Tente de novo.")
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-28">
      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#F0F0F0]">Oficina</h2>
        <SeletorOficina
          selecionado={cliente}
          onSelecionar={setCliente}
          onTelefoneNovo={setTelefoneNovo}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#F0F0F0]">Peça</h2>
        <CapturaFoto fotos={fotos} onChange={setFotos} desabilitado={enviando} />

        {!digitarDefeito ? (
          <GravadorAudio
            audio={audio}
            onChange={setAudio}
            onPrecisaDigitar={() => setDigitarDefeito(true)}
            desabilitado={enviando}
          />
        ) : (
          <div className="space-y-2">
            <textarea
              value={defeito}
              onChange={(e) => setDefeito(e.target.value)}
              placeholder="O que a peça tem? (ex: painel de Gol 2010, chicote diferente, não acende)"
              rows={3}
              className="w-full bg-[#111111] border border-[#1C1C1C] text-base text-[#F0F0F0] px-4 py-3 rounded-sm focus:outline-none focus:border-[#E8FF47] placeholder:text-[#8A8A8A]"
            />
            <button
              type="button"
              onClick={() => setDigitarDefeito(false)}
              className="w-full py-2 text-sm font-bold text-[#B4B4B4] hover:text-white"
            >
              voltar a gravar
            </button>
          </div>
        )}

        {!mostrarApelido ? (
          <button
            type="button"
            onClick={() => setMostrarApelido(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold text-[#B4B4B4] hover:text-white"
          >
            <Cpu size={16} /> dar um nome à peça
          </button>
        ) : (
          <input
            value={apelidoPeca}
            onChange={(e) => setApelidoPeca(e.target.value)}
            placeholder="ex: painel Gol 2010 cinza"
            className="w-full bg-[#111111] border border-[#1C1C1C] text-base text-[#F0F0F0] px-4 py-3 rounded-sm focus:outline-none focus:border-[#E8FF47] placeholder:text-[#8A8A8A]"
          />
        )}

        <p className="text-sm text-[#B4B4B4]">
          Sem nome, a peça entra como <span className="text-[#F0F0F0]">Peça #nº da OS</span> e dá
          para identificar depois, com a bancada parada.
        </p>
      </section>

      {erro && (
        <p className="text-base font-bold text-[#FF4444] bg-[#2A0D0D] border border-[#FF4444]/40 px-4 py-3 rounded-sm">
          {erro}
        </p>
      )}

      {/* Fixo no rodapé: o botão principal nunca fica fora da tela no celular. */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 md:relative p-4 md:p-0 bg-[#0C0C0C] border-t md:border-0 border-[#1C1C1C]">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={enviar}
            disabled={!podeEnviar}
            className="w-full flex items-center justify-center gap-3 bg-[#E8FF47] text-black py-5 rounded-sm text-base font-bold uppercase tracking-wide disabled:opacity-40 active:brightness-90 transition-all"
          >
            {enviando ? (
              <>
                <Loader2 size={20} className="animate-spin" /> Registrando...
              </>
            ) : (
              <>
                <Check size={20} /> Registrar entrada
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function gerarChave() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
