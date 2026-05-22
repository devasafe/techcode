import { auth } from "@/auth"
import { Badge } from "@/components/ui/badge"

export async function Header() {
  const session = await auth()
  const user = session?.user

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center justify-end px-6">
      {user && (
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-zinc-400">{user.email}</p>
          </div>
          <div className="flex gap-1">
            {user.perfis.map((p) => (
              <Badge key={p} variant="secondary" className="text-xs capitalize">
                {p}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
