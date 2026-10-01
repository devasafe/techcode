import { EntradaRapida } from "@/components/entrada/EntradaRapida"

export default function EntradaPage() {
  return (
    <div className="space-y-5">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-bold uppercase tracking-wide text-[#F0F0F0]">
          Entrada de peça
        </h1>
        <p className="text-sm text-[#B4B4B4] mt-1">
          Só a oficina é obrigatória. Foto e áudio são opcionais.
        </p>
      </div>
      <EntradaRapida />
    </div>
  )
}
