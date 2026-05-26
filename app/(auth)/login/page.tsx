"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro("")
    setCarregando(true)

    const form = new FormData(e.currentTarget)
    const result = await signIn("credentials", {
      email: form.get("email"),
      senha: form.get("senha"),
      redirect: false,
    })

    setCarregando(false)

    if (result?.error) {
      setErro("Email ou senha incorretos.")
    } else {
      router.push("/")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#0C0C0C] flex items-center justify-center px-4"
      style={{
        backgroundImage: `radial-gradient(circle, #1C1C1C 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#E8FF47]">
            Tech Code
          </p>
          <p className="text-[#555555] text-xs mt-1 uppercase tracking-widest">Laboratório de ECUs</p>
        </div>

        <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[10px] font-semibold uppercase tracking-widest text-[#555555]">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full bg-[#0C0C0C] border border-[#1C1C1C] text-sm text-[#F0F0F0] px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors placeholder:text-[#333333]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="senha" className="block text-[10px] font-semibold uppercase tracking-widest text-[#555555]">
                Senha
              </label>
              <input
                id="senha"
                name="senha"
                type="password"
                required
                autoComplete="current-password"
                className="w-full bg-[#0C0C0C] border border-[#1C1C1C] text-sm text-[#F0F0F0] px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#E8FF47] transition-colors"
              />
            </div>

            {erro && <p className="text-xs text-[#FF4444]">{erro}</p>}

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-[#E8FF47] text-black text-xs font-semibold uppercase tracking-widest py-2.5 rounded-sm hover:brightness-110 disabled:opacity-60 transition-all mt-2"
            >
              {carregando ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
