"use client"

import { useRef, useState } from "react"
import { Camera, X } from "lucide-react"
import { reduzirImagem, formatarTamanho } from "@/lib/imagem"

type Props = {
  fotos: File[]
  onChange: (fotos: File[]) => void
  desabilitado?: boolean
}

export function CapturaFoto({ fotos, onChange, desabilitado }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [processando, setProcessando] = useState(false)

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const escolhidas = Array.from(e.target.files ?? [])
    if (!escolhidas.length) return
    setProcessando(true)
    try {
      // Reduz antes de guardar: é o que mantém o upload rápido no wifi da oficina.
      const reduzidas = await Promise.all(escolhidas.map(reduzirImagem))
      onChange([...fotos, ...reduzidas])
    } finally {
      setProcessando(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        // capture=environment abre a câmera traseira direto, sem passar pela galeria.
        capture="environment"
        multiple
        onChange={aoEscolher}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={desabilitado || processando}
        className="w-full flex items-center justify-center gap-3 bg-[#111111] border border-[#1C1C1C] py-5 rounded-sm text-base font-bold uppercase tracking-wide text-[#F0F0F0] hover:border-[#B4B4B4] active:bg-[#1A1A1A] transition-colors disabled:opacity-50"
      >
        <Camera size={22} className="text-[#E8FF47]" />
        {processando ? "Preparando..." : fotos.length ? "Mais uma foto" : "Foto da peça"}
      </button>

      {fotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {fotos.map((f, i) => (
            <div key={`${f.name}-${i}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(f)}
                alt={`foto ${i + 1}`}
                className="w-full h-24 object-cover rounded-sm border border-[#1C1C1C]"
              />
              <button
                type="button"
                onClick={() => onChange(fotos.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 bg-black/80 border border-[#2A2A2A] rounded-sm p-1.5 text-[#F0F0F0]"
                aria-label="Remover foto"
              >
                <X size={14} />
              </button>
              <span className="absolute bottom-1 left-1 text-[11px] font-bold text-[#B4B4B4] bg-black/80 px-1.5 py-0.5 rounded-sm">
                {formatarTamanho(f.size)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
