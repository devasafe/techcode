"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  FileText,
  ListOrdered,
  Cpu,
  DollarSign,
  Receipt,
  UserCog,
  LogOut,
} from "lucide-react"
import { signOut } from "next-auth/react"

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "atendente", "tecnico"] },
  { href: "/clientes", label: "Clientes", icon: Users, roles: ["admin", "atendente", "tecnico"] },
  { href: "/os", label: "OS", icon: FileText, roles: ["admin", "atendente", "tecnico"] },
  { href: "/fila", label: "Fila", icon: ListOrdered, roles: ["admin", "atendente", "tecnico"] },
  { href: "/centrais", label: "Centrais", icon: Cpu, roles: ["admin", "atendente", "tecnico"] },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign, roles: ["admin"] },
  { href: "/comissoes", label: "Comissões", icon: Receipt, roles: ["admin"] },
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
      <aside className="hidden md:flex flex-col w-[220px] min-h-screen bg-[#111111] border-r border-[#1C1C1C]">
        <div className="px-6 py-5 border-b border-[#1C1C1C]">
          <span className="font-mono text-sm font-bold text-[#E8FF47] tracking-tighter">
            Tech Code
          </span>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {itensVisiveis.map((item) => {
            const ativo = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors ${
                  ativo
                    ? "border-l-2 border-[#E8FF47] text-white bg-[#1A1A1A]"
                    : "border-l-2 border-transparent text-[#555555] hover:text-white hover:bg-[#161616]"
                }`}
              >
                <item.icon size={15} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-2 py-3 border-t border-[#1C1C1C]">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#555555] hover:text-white hover:bg-[#161616] transition-colors border-l-2 border-transparent"
          >
            <LogOut size={15} />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 border-t border-[#1C1C1C] bg-[#0C0C0C] flex items-center h-16 overflow-x-auto scrollbar-hide">
        {itensVisiveis.map((item) => {
          const ativo = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 min-w-[64px] h-full px-1 shrink-0 transition-colors ${
                ativo ? "text-[#E8FF47]" : "text-[#555555]"
              }`}
            >
              <item.icon size={18} />
              <span className="text-[9px] font-semibold uppercase tracking-widest leading-none">
                {item.label.split(" ")[0]}
              </span>
            </Link>
          )
        })}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex flex-col items-center justify-center gap-1 min-w-[64px] h-full px-1 shrink-0 text-[#555555] transition-colors"
        >
          <LogOut size={18} />
          <span className="text-[9px] font-semibold uppercase tracking-widest leading-none">Sair</span>
        </button>
      </nav>
    </>
  )
}
