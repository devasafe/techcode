import { auth } from "@/auth"

export async function Header() {
  const session = await auth()
  const user = session?.user

  const iniciais = user?.name
    ?.split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "AU"

  return (
    <header className="h-12 border-b border-[#1C1C1C] bg-[#111111] flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-widest text-[#E8FF47]">
          Tech Code
        </span>
      </div>
      {user && (
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-white">{user.name}</p>
            <p className="text-[10px] uppercase tracking-widest text-[#555555]">
              {user.perfis.join(", ")}
            </p>
          </div>
          <div className="h-7 w-7 rounded-sm bg-[#1C1C1C] border border-[#2A2A2A] flex items-center justify-center font-mono text-[10px] text-[#E8FF47]">
            {iniciais}
          </div>
        </div>
      )}
    </header>
  )
}
