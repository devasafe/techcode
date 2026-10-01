"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Cpu, AlertTriangle, RefreshCw } from "lucide-react"
import { CapturaFoto } from "@/components/captura/CapturaFoto"
import { GravadorAudio } from "@/components/captura/GravadorAudio"
import { SeletorOficina, type ClienteResumo } from "@/components/entrada/SeletorOficina"

type FalhaMidia = { tipo: "foto" | "audio"; motivo: string }

type Registrada = {
  _id: string
  numero_os: number
  falhas: FalhaMidia[]
}

export function EntradaRapida() {
  const router = useRouter()

  const [cliente, setCliente] = useState<ClienteResumo | null>(null)
  const [telefoneNovo, setTelefoneNovo] = useState<string | null>(null)
  const [fotos, setFotos] = useState<File[]>([])
  const [audioPeca, setAudioPeca] = useState<File | null>(null)
  const [audioDefeito, setAudioDefeito] = useState<File | null>(null)
  const [digitarDefeito, setDigitarDefeito] = useState(false)
  const [defeito, setDefeito] = useState("")
  const [apelidoPeca, setApelidoPeca] = useState("")
  const [mostrarApelido, setMostrarApelido] = useState(false)

  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState("")
  /** Preenchido quando a OS foi criada MAS alguma mídia não subiu. */
  const [registrada, setRegistrada] = useState<Registrada | null>(null)
  const [reenviando, setReenviando] = useState(false)

  // Gerada uma vez por formulário: é o que faz duplo toque ou retry em wifi ruim
  // não criarem duas OS.
  const chaveRef = useRef<string>(gerarChave())

  const podeEnviar = Boolean(cliente) && !enviando

  function montarMidia() {
    const form = new FormData()
    for (const f of fotos) form.append("foto", f)
    // Dois campos com papéis diferentes: um diz o que a peça É, o outro o que
    // ela TEM. É o que evita o modelo da central cair em "defeito relatado".
    if (audioPeca) {
      form.set("audio_peca", audioPeca)
      // O tipo real varia por plataforma; o servidor guarda o que veio.
      form.set("audio_peca_mime", audioPeca.type)
    }
    if (audioDefeito) {
      form.set("audio_defeito", audioDefeito)
      form.set("audio_defeito_mime", audioDefeito.type)
    }
    return form
  }

  async function enviar() {
    if (!cliente) {
      setErro("Escolha a oficina")
      return
    }
    setEnviando(true)
    setErro("")

    const form = montarMidia()
    form.set("chave_idempotencia", chaveRef.current)
    if (cliente._id) form.set("cliente_id", cliente._id)
    else if (telefoneNovo) form.set("telefone", telefoneNovo)
    if (defeito.trim()) form.set("defeito", defeito.trim())
    if (apelidoPeca.trim()) form.set("apelido_peca", apelidoPeca.trim())

    try {
      const res = await fetch("/api/entrada", { method: "POST", body: form })
      const dados = await res.json()
      if (!res.ok) {
        setErro(dados?.error ?? "Não deu para registrar")
        setEnviando(false)
        return
      }

      // A OS existe. Se alguma mídia falhou, NÃO seguimos em silêncio: perder a
      // foto sem avisar é pior que mostrar o problema.
      if (dados.falhas?.length) {
        setRegistrada({ _id: dados._id, numero_os: dados.numero_os, falhas: dados.falhas })
        setEnviando(false)
        return
      }

      router.push(`/os/${dados._id}`)
    } catch {
      setErro("Sem conexão. Tente de novo.")
      setEnviando(false)
    }
  }

  async function reenviarMidia() {
    if (!registrada) return
    setReenviando(true)
    try {
      const res = await fetch(`/api/os/${registrada._id}/midias`, {
        method: "POST",
        body: montarMidia(),
      })
      const dados = await res.json()
      if (res.ok && !dados.falhas?.length) {
        router.push(`/os/${registrada._id}`)
        return
      }
      setRegistrada({ ...registrada, falhas: dados.falhas ?? registrada.falhas })
    } catch {
      // mantém o aviso na tela
    } finally {
      setReenviando(false)
    }
  }

  if (registrada) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="bg-[#0D2A1A] border border-[#22C55E]/40 rounded-sm px-4 py-4">
          <p className="text-base font-bold text-[#22C55E]">
            OS #{registrada.numero_os} registrada
          </p>
          <p className="text-sm text-[#B4B4B4] mt-1">A peça já está na fila.</p>
        </div>

        <div className="bg-[#2A1800] border border-[#F59E0B]/40 rounded-sm px-4 py-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-[#F59E0B] shrink-0 mt-0.5" />
            <div>
              <p className="text-base font-bold text-[#F59E0B]">
                {registrada.falhas.length === 1
                  ? "Um arquivo não subiu"
                  : `${registrada.falhas.length} arquivos não subiram`}
              </p>
              <ul className="mt-2 space-y-1">
                {registrada.falhas.map((f, i) => (
                  <li key={i} className="text-sm text-[#F0F0F0]">
                    <span className="font-bold uppercase">{f.tipo}</span>: {f.motivo}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            type="button"
            onClick={reenviarMidia}
            disabled={reenviando}
            className="w-full flex items-center justify-center gap-2 bg-[#E8FF47] text-black py-4 rounded-sm text-base font-bold uppercase tracking-wide disabled:opacity-50"
          >
            {reenviando ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <RefreshCw size={18} /> Tentar enviar de novo
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => router.push(`/os/${registrada._id}`)}
            className="w-full py-3 text-sm font-bold text-[#B4B4B4] hover:text-white"
          >
            seguir sem os arquivos
          </button>
        </div>
      </div>
    )
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

        {/* Qual é a peça: vira o nome dela no acervo */}
        <GravadorAudio
          audio={audioPeca}
          onChange={setAudioPeca}
          desabilitado={enviando}
          rotulo="Falar qual é a peça"
          nomeArquivo="peca"
        />

        {/* O que ela tem: vira o defeito relatado */}
        {!digitarDefeito ? (
          <GravadorAudio
            audio={audioDefeito}
            onChange={setAudioDefeito}
            onPrecisaDigitar={() => setDigitarDefeito(true)}
            desabilitado={enviando}
            rotulo="Falar o defeito"
            nomeArquivo="defeito"
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
          O áudio da peça vira o nome dela no acervo; o do defeito vai para
          &ldquo;defeito relatado&rdquo;. Sem nenhum dos dois, a peça entra como{" "}
          <span className="text-[#F0F0F0]">Peça #nº da OS</span> e dá para identificar depois.
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
