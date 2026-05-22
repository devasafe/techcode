import type { OSStatus } from "@/types"

const STATUS_LABEL: Record<OSStatus, string> = {
  aberta: "Aberta",
  na_fila: "Na fila",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  devolvida: "Devolvida",
  substituida: "Substituída",
}

const STATUS_COLOR: Record<OSStatus, string> = {
  aberta: "bg-zinc-700 text-zinc-300",
  na_fila: "bg-amber-900/40 text-amber-400",
  em_andamento: "bg-violet-900/40 text-violet-400",
  concluida: "bg-green-900/40 text-green-400",
  devolvida: "bg-red-900/40 text-red-400",
  substituida: "bg-orange-900/40 text-orange-400",
}

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status as OSStatus] ?? status
  const color = STATUS_COLOR[status as OSStatus] ?? "bg-zinc-700 text-zinc-300"
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>
      {label}
    </span>
  )
}
