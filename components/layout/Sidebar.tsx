"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  FileText,
  ListTodo,
  Cpu,
  DollarSign,
  UserCog,
  LogOut,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "atendente", "tecnico"] },
  { href: "/clientes", label: "Clientes", icon: Users, roles: ["admin", "atendente", "tecnico"] },
  { href: "/os", label: "Ordens de Serviço", icon: FileText, roles: ["admin", "atendente", "tecnico"] },
  { href: "/fila", label: "Fila", icon: ListTodo, roles: ["admin", "atendente", "tecnico"] },
  { href: "/centrais", label: "Centrais", icon: Cpu, roles: ["admin", "atendente", "tecnico"] },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign, roles: ["admin"] },
  { href: "/equipe", label: "Equipe", icon: UserCog, roles: ["admin"] },
]

interface SidebarProps {
  perfis: string[]
}

export function Sidebar({ perfis }: SidebarProps) {
  const pathname = usePathname()

  const itensVisiveis = NAV_ITEMS.filter((item) =>
    item.roles.some((r) => perfis.includes(r))
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen bg-zinc-900 border-r border-zinc-800 px-3 py-6">
        <div className="px-3 mb-8">
          <span className="text-lg font-bold text-white">Tech Code</span>
        </div>

        <nav className="flex-1 space-y-1">
          {itensVisiveis.map((item) => {
            const ativo = item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  ativo
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex justify-around py-2 z-50">
        {itensVisiveis.slice(0, 5).map((item) => {
          const ativo = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-xs transition-colors",
                ativo ? "text-white" : "text-zinc-500"
              )}
            >
              <item.icon size={20} />
              <span className="hidden sm:block">{item.label.split(" ")[0]}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
