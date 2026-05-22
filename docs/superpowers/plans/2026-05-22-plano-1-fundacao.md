# Tech Code — Plano 1/4: Fundação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Projeto Next.js 15 configurado com autenticação NextAuth.js v5, todos os modelos Mongoose, layout responsivo com sidebar e módulo completo de gestão de usuários (equipe).

**Architecture:** App Router com TypeScript. Lógica de negócio em `lib/services/` — testável sem HTTP. API routes como wrappers finos sobre services. NextAuth.js v5 com Credentials provider e JWT. Middleware protege rotas por role. Usuários podem ter múltiplos perfis (array) e permissões são aditivas.

**Tech Stack:** Next.js 15, TypeScript 5, Tailwind CSS, shadcn/ui, Mongoose 8, NextAuth.js v5, bcryptjs, mongodb-memory-server, Jest

---

## File Map

```
techcode/
├── .env.example
├── .gitignore
├── jest.config.ts
├── jest.setup.ts
├── auth.ts                                   # NextAuth v5 config
├── middleware.ts                             # proteção de rotas por role
├── types/
│   ├── index.ts                              # tipos de domínio compartilhados
│   └── next-auth.d.ts                        # extensão de tipos da sessão
├── lib/
│   ├── db.ts                                 # conexão singleton MongoDB
│   └── services/
│       └── usuario.service.ts               # CRUD de usuários (lógica testável)
├── models/
│   ├── Usuario.ts
│   ├── Cliente.ts
│   ├── Central.ts
│   ├── OS.ts
│   └── Comissao.ts
├── app/
│   ├── layout.tsx                            # root layout
│   ├── (auth)/
│   │   ├── layout.tsx                        # layout sem sidebar
│   │   └── login/page.tsx                    # página de login
│   ├── (dashboard)/
│   │   ├── layout.tsx                        # layout com sidebar
│   │   ├── page.tsx                          # dashboard placeholder
│   │   └── equipe/page.tsx                   # gestão de usuários
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       └── usuarios/
│           ├── route.ts                      # GET lista, POST criar
│           └── [id]/route.ts                # GET, PUT, DELETE
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   └── equipe/
│       └── UsuarioForm.tsx
└── __tests__/
    ├── services/usuario.service.test.ts
    └── models/OS.test.ts
```

---

### Task 1: Inicializar projeto e instalar dependências

**Files:**
- Create: `package.json` (gerado pelo CNA)
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Criar o projeto Next.js 15 dentro da pasta techcode**

```bash
cd C:\Users\00asa\Desktop\techcode
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```

Quando perguntar se quer continuar em diretório não-vazio, responda `y`. Quando perguntar sobre Turbopack, responda `Yes`.

- [ ] **Step 2: Instalar dependências de produção**

```bash
npm install next-auth@beta mongoose bcryptjs cloudinary @react-pdf/renderer
npm install -D @types/bcryptjs
```

- [ ] **Step 3: Instalar dependências de teste**

```bash
npm install -D jest jest-environment-node @types/jest ts-jest mongodb-memory-server
```

- [ ] **Step 4: Instalar shadcn/ui**

```bash
npx shadcn@latest init -d
```

Escolha as opções padrão (New York, Zinc, CSS variables = Yes).

- [ ] **Step 5: Adicionar componentes shadcn necessários neste plano**

```bash
npx shadcn@latest add button input label card badge table dialog form select
```

- [ ] **Step 6: Criar `.env.example`**

```env
# MongoDB Atlas — substitua pela sua connection string
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/techcode

# NextAuth — gere com: openssl rand -base64 32
AUTH_SECRET=sua_secret_aqui

# URL base do app
NEXTAUTH_URL=http://localhost:3000

# Cloudinary (usado nos planos seguintes)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

- [ ] **Step 7: Criar `.env.local` com seus valores reais**

Copie `.env.example` para `.env.local` e preencha os valores reais do MongoDB Atlas e um AUTH_SECRET gerado.

- [ ] **Step 8: Confirmar que `.env.local` está no `.gitignore`**

O arquivo `.gitignore` gerado pelo CNA já inclui `.env.local`. Verifique que a linha existe:
```
.env.local
```

- [ ] **Step 9: Commit inicial**

```bash
git init
git add -A
git commit -m "chore: init Next.js 15 project with dependencies"
```

---

### Task 2: Configurar Jest

**Files:**
- Create: `jest.config.ts`
- Create: `jest.setup.ts`

- [ ] **Step 1: Criar `jest.config.ts`**

```ts
import type { Config } from "jest"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({ dir: "./" })

const config: Config = {
  testEnvironment: "node",
  setupFilesAfterEach: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathPattern: "__tests__",
}

export default createJestConfig(config)
```

- [ ] **Step 2: Criar `jest.setup.ts`**

```ts
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"

let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

afterEach(async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
})
```

- [ ] **Step 3: Adicionar script de teste no `package.json`**

No `package.json`, adicione/atualize a seção `scripts`:
```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "test": "jest",
  "test:watch": "jest --watch"
}
```

- [ ] **Step 4: Verificar que Jest funciona**

```bash
npm test -- --passWithNoTests
```

Expected: `No tests found, exiting with code 0` ou similar.

- [ ] **Step 5: Commit**

```bash
git add jest.config.ts jest.setup.ts package.json
git commit -m "chore: configure Jest with mongodb-memory-server"
```

---

### Task 3: Conexão com MongoDB e tipos base

**Files:**
- Create: `lib/db.ts`
- Create: `types/index.ts`

- [ ] **Step 1: Criar `lib/db.ts`**

```ts
import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI não definida em .env.local")
}

let cached = (global as any).mongoose ?? { conn: null, promise: null }
;(global as any).mongoose = cached

export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false })
  }

  cached.conn = await cached.promise
  return cached.conn
}
```

- [ ] **Step 2: Criar `types/index.ts`**

```ts
export type Perfil = "admin" | "atendente" | "tecnico"

export type OSStatus =
  | "aberta"
  | "na_fila"
  | "em_andamento"
  | "concluida"
  | "devolvida"
  | "substituida"

export type TipoDevolucao = "reembolso" | "substituicao"
```

- [ ] **Step 3: Commit**

```bash
git add lib/db.ts types/index.ts
git commit -m "feat: add MongoDB connection and base types"
```

---

### Task 4: Modelos Mongoose

**Files:**
- Create: `models/Usuario.ts`
- Create: `models/Cliente.ts`
- Create: `models/Central.ts`
- Create: `models/OS.ts`
- Create: `models/Comissao.ts`
- Create: `__tests__/models/OS.test.ts`

- [ ] **Step 1: Escrever o teste de validação do modelo OS**

```ts
// __tests__/models/OS.test.ts
import OS from "@/models/OS"

describe("OS model", () => {
  it("rejeita OS sem cliente_id", async () => {
    const os = new OS({
      central_id: "507f1f77bcf86cd799439011",
      defeito_descricao: "falha na bobina",
    })
    await expect(os.validate()).rejects.toThrow()
  })

  it("calcula numero_os em sequência", async () => {
    const os1 = await OS.create({
      cliente_id: "507f1f77bcf86cd799439011",
      central_id: "507f1f77bcf86cd799439012",
      defeito_descricao: "defeito 1",
    })
    const os2 = await OS.create({
      cliente_id: "507f1f77bcf86cd799439011",
      central_id: "507f1f77bcf86cd799439012",
      defeito_descricao: "defeito 2",
    })
    expect(os2.numero_os).toBe(os1.numero_os + 1)
  })

  it("status padrão é aberta", async () => {
    const os = await OS.create({
      cliente_id: "507f1f77bcf86cd799439011",
      central_id: "507f1f77bcf86cd799439012",
      defeito_descricao: "teste",
    })
    expect(os.status).toBe("aberta")
  })
})
```

- [ ] **Step 2: Rodar o teste para ver falhar**

```bash
npm test -- __tests__/models/OS.test.ts
```

Expected: FAIL — `Cannot find module '@/models/OS'`

- [ ] **Step 3: Criar `models/Usuario.ts`**

```ts
import mongoose, { Schema, Document } from "mongoose"
import type { Perfil } from "@/types"

export interface IUsuario extends Document {
  nome: string
  email: string
  senha: string
  perfis: Perfil[]
  comissao_pct: number
  ativo: boolean
  created_at: Date
}

const UsuarioSchema = new Schema<IUsuario>({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  senha: { type: String, required: true },
  perfis: {
    type: [String],
    enum: ["admin", "atendente", "tecnico"],
    required: true,
    validate: (v: string[]) => v.length > 0,
  },
  comissao_pct: { type: Number, default: 0, min: 0, max: 100 },
  ativo: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
})

export default mongoose.models.Usuario ||
  mongoose.model<IUsuario>("Usuario", UsuarioSchema)
```

- [ ] **Step 4: Criar `models/Cliente.ts`**

```ts
import mongoose, { Schema, Document } from "mongoose"

export interface ICliente extends Document {
  nome: string
  telefone: string
  email?: string
  cpf_cnpj?: string
  endereco?: string
  created_at: Date
}

const ClienteSchema = new Schema<ICliente>({
  nome: { type: String, required: true, trim: true },
  telefone: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  cpf_cnpj: String,
  endereco: String,
  created_at: { type: Date, default: Date.now },
})

ClienteSchema.index({ nome: "text", telefone: "text" })

export default mongoose.models.Cliente ||
  mongoose.model<ICliente>("Cliente", ClienteSchema)
```

- [ ] **Step 5: Criar `models/Central.ts`**

```ts
import mongoose, { Schema, Document } from "mongoose"

export interface ICentral extends Document {
  marca: string
  modelo: string
  codigo: string
  descricao?: string
}

const CentralSchema = new Schema<ICentral>({
  marca: { type: String, required: true, trim: true },
  modelo: { type: String, required: true, trim: true },
  codigo: { type: String, required: true, trim: true, uppercase: true },
  descricao: String,
})

CentralSchema.index({ modelo: "text", codigo: "text", marca: "text" })

export default mongoose.models.Central ||
  mongoose.model<ICentral>("Central", CentralSchema)
```

- [ ] **Step 6: Criar `models/OS.ts`**

```ts
import mongoose, { Schema, Document, Types } from "mongoose"
import type { OSStatus, TipoDevolucao } from "@/types"

export interface IRetornoGarantia {
  data: Date
  descricao: string
  tecnico_id: Types.ObjectId
}

export interface IDevolucao {
  tipo: TipoDevolucao
  motivo: string
  valor_reembolsado?: number
  central_adquirida?: string
  custo_central?: number
  novo_valor_cobrado?: number
  data: Date
}

export interface IOS extends Document {
  numero_os: number
  cliente_id: Types.ObjectId
  central_id: Types.ObjectId
  tecnico_id?: Types.ObjectId
  status: OSStatus
  defeito_descricao: string
  solucao_descricao?: string
  fotos: string[]
  pecas: { nome: string; custo: number }[]
  valor_cobrado: number
  custo_total_pecas: number
  lucro_liquido: number
  garantia_dias: number
  garantia_ate?: Date
  retornos_garantia: IRetornoGarantia[]
  devolucao?: IDevolucao
  created_at: Date
  closed_at?: Date
}

const OSSchema = new Schema<IOS>({
  numero_os: { type: Number, unique: true },
  cliente_id: { type: Schema.Types.ObjectId, ref: "Cliente", required: true },
  central_id: { type: Schema.Types.ObjectId, ref: "Central", required: true },
  tecnico_id: { type: Schema.Types.ObjectId, ref: "Usuario" },
  status: {
    type: String,
    enum: ["aberta", "na_fila", "em_andamento", "concluida", "devolvida", "substituida"],
    default: "aberta",
  },
  defeito_descricao: { type: String, required: true },
  solucao_descricao: String,
  fotos: [String],
  pecas: [{ nome: String, custo: Number }],
  valor_cobrado: { type: Number, default: 0 },
  custo_total_pecas: { type: Number, default: 0 },
  lucro_liquido: { type: Number, default: 0 },
  garantia_dias: { type: Number, default: 0 },
  garantia_ate: Date,
  retornos_garantia: [
    {
      data: { type: Date, default: Date.now },
      descricao: String,
      tecnico_id: { type: Schema.Types.ObjectId, ref: "Usuario" },
    },
  ],
  devolucao: {
    tipo: { type: String, enum: ["reembolso", "substituicao"] },
    motivo: String,
    valor_reembolsado: Number,
    central_adquirida: String,
    custo_central: Number,
    novo_valor_cobrado: Number,
    data: Date,
  },
  created_at: { type: Date, default: Date.now },
  closed_at: Date,
})

OSSchema.pre("save", async function (next) {
  if (this.isNew) {
    const last = await mongoose
      .model("OS")
      .findOne({}, { numero_os: 1 }, { sort: { numero_os: -1 } })
    this.numero_os = last ? last.numero_os + 1 : 1
  }
  next()
})

export default mongoose.models.OS || mongoose.model<IOS>("OS", OSSchema)
```

- [ ] **Step 7: Criar `models/Comissao.ts`**

```ts
import mongoose, { Schema, Document, Types } from "mongoose"

export interface IComissao extends Document {
  os_id: Types.ObjectId
  tecnico_id: Types.ObjectId
  valor_os: number
  pct_comissao: number
  valor_comissao: number
  pago: boolean
  data_pagamento?: Date
}

const ComissaoSchema = new Schema<IComissao>({
  os_id: { type: Schema.Types.ObjectId, ref: "OS", required: true },
  tecnico_id: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
  valor_os: { type: Number, required: true },
  pct_comissao: { type: Number, required: true },
  valor_comissao: { type: Number, required: true },
  pago: { type: Boolean, default: false },
  data_pagamento: Date,
})

export default mongoose.models.Comissao ||
  mongoose.model<IComissao>("Comissao", ComissaoSchema)
```

- [ ] **Step 8: Rodar os testes e verificar que passam**

```bash
npm test -- __tests__/models/OS.test.ts
```

Expected: PASS — 3 testes passando.

- [ ] **Step 9: Commit**

```bash
git add models/ __tests__/models/
git commit -m "feat: add Mongoose models and OS tests"
```

---

### Task 5: NextAuth.js v5 e Middleware

**Files:**
- Create: `auth.ts`
- Create: `types/next-auth.d.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `middleware.ts`

- [ ] **Step 1: Criar `types/next-auth.d.ts`**

```ts
import "next-auth"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    perfis: string[]
  }
  interface Session {
    user: {
      id: string
      perfis: string[]
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    perfis: string[]
  }
}
```

- [ ] **Step 2: Criar `auth.ts`**

```ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { connectDB } from "@/lib/db"
import Usuario from "@/models/Usuario"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email" },
        senha: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.senha) return null

        await connectDB()
        const user = await Usuario.findOne({
          email: credentials.email,
          ativo: true,
        })

        if (!user) return null

        const senhaCorreta = await bcrypt.compare(
          credentials.senha as string,
          user.senha
        )
        if (!senhaCorreta) return null

        return {
          id: user._id.toString(),
          name: user.nome,
          email: user.email,
          perfis: user.perfis,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.perfis = user.perfis
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id
      session.user.perfis = token.perfis
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
})
```

- [ ] **Step 3: Criar `app/api/auth/[...nextauth]/route.ts`**

```ts
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

- [ ] **Step 4: Criar `middleware.ts`**

```ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"

const ROTAS_ADMIN = ["/financeiro", "/equipe"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const logado = !!req.auth

  if (!logado && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (logado && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  const rotaAdmin = ROTAS_ADMIN.some((r) => pathname.startsWith(r))
  const ehAdmin = req.auth?.user.perfis.includes("admin")

  if (rotaAdmin && !ehAdmin) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

- [ ] **Step 5: Commit**

```bash
git add auth.ts types/next-auth.d.ts app/api/auth middleware.ts
git commit -m "feat: add NextAuth v5 with credentials and role middleware"
```

---

### Task 6: Layout responsivo com Sidebar

**Files:**
- Create: `app/layout.tsx`
- Create: `app/(auth)/layout.tsx`
- Create: `app/(dashboard)/layout.tsx`
- Create: `components/layout/Sidebar.tsx`
- Create: `components/layout/Header.tsx`

- [ ] **Step 1: Atualizar `app/layout.tsx`**

```tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Tech Code",
  description: "Gestão de laboratório de eletrônica automotiva",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Criar `app/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Criar `components/layout/Sidebar.tsx`**

```tsx
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
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
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
```

- [ ] **Step 4: Criar `components/layout/Header.tsx`**

```tsx
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
```

- [ ] **Step 5: Criar `app/(dashboard)/layout.tsx`**

```tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar perfis={session.user.perfis} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx app/(auth)/layout.tsx app/(dashboard)/layout.tsx components/layout/
git commit -m "feat: add responsive sidebar layout with role-based navigation"
```

---

### Task 7: Página de Login

**Files:**
- Create: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Criar `app/(auth)/login/page.tsx`**

```tsx
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
    <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-center text-white">Tech Code</CardTitle>
        <p className="text-center text-zinc-400 text-sm">Acesse seu laboratório</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha" className="text-zinc-300">Senha</Label>
            <Input
              id="senha"
              name="senha"
              type="password"
              required
              autoComplete="current-password"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(auth)/login/
git commit -m "feat: add login page"
```

---

### Task 8: Service e testes de usuários

**Files:**
- Create: `lib/services/usuario.service.ts`
- Create: `__tests__/services/usuario.service.test.ts`

- [ ] **Step 1: Escrever os testes**

```ts
// __tests__/services/usuario.service.test.ts
import {
  criarUsuario,
  listarUsuarios,
  buscarUsuarioPorId,
  atualizarUsuario,
  desativarUsuario,
} from "@/lib/services/usuario.service"
import Usuario from "@/models/Usuario"

describe("usuario.service", () => {
  const dadosBase = {
    nome: "João Admin",
    email: "joao@techcode.com",
    senha: "senha123",
    perfis: ["admin"] as const,
  }

  it("cria usuário com senha hashada", async () => {
    const user = await criarUsuario(dadosBase)
    expect(user.nome).toBe("João Admin")
    expect(user.senha).not.toBe("senha123")
    expect(user.ativo).toBe(true)
  })

  it("rejeita email duplicado", async () => {
    await criarUsuario(dadosBase)
    await expect(criarUsuario(dadosBase)).rejects.toThrow("Email já cadastrado")
  })

  it("lista usuários sem retornar senha", async () => {
    await criarUsuario(dadosBase)
    const lista = await listarUsuarios()
    expect(lista.length).toBe(1)
    expect((lista[0] as any).senha).toBeUndefined()
  })

  it("busca usuário por id sem senha", async () => {
    const criado = await criarUsuario(dadosBase)
    const encontrado = await buscarUsuarioPorId(criado._id.toString())
    expect(encontrado?.nome).toBe("João Admin")
    expect((encontrado as any)?.senha).toBeUndefined()
  })

  it("atualiza nome do usuário", async () => {
    const user = await criarUsuario(dadosBase)
    const atualizado = await atualizarUsuario(user._id.toString(), { nome: "João Silva" })
    expect(atualizado?.nome).toBe("João Silva")
  })

  it("desativa usuário", async () => {
    const user = await criarUsuario(dadosBase)
    await desativarUsuario(user._id.toString())
    const db = await Usuario.findById(user._id)
    expect(db?.ativo).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar testes para ver falhar**

```bash
npm test -- __tests__/services/usuario.service.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/services/usuario.service'`

- [ ] **Step 3: Criar `lib/services/usuario.service.ts`**

```ts
import { connectDB } from "@/lib/db"
import Usuario from "@/models/Usuario"
import bcrypt from "bcryptjs"
import type { Perfil } from "@/types"

export type CreateUsuarioInput = {
  nome: string
  email: string
  senha: string
  perfis: Perfil[]
  comissao_pct?: number
}

export type UpdateUsuarioInput = {
  nome?: string
  email?: string
  senha?: string
  perfis?: Perfil[]
  comissao_pct?: number
  ativo?: boolean
}

export async function listarUsuarios() {
  await connectDB()
  return Usuario.find({}).select("-senha").lean()
}

export async function buscarUsuarioPorId(id: string) {
  await connectDB()
  return Usuario.findById(id).select("-senha").lean()
}

export async function criarUsuario(data: CreateUsuarioInput) {
  await connectDB()
  const existente = await Usuario.findOne({ email: data.email.toLowerCase() })
  if (existente) throw new Error("Email já cadastrado")
  const hash = await bcrypt.hash(data.senha, 10)
  return Usuario.create({ ...data, senha: hash })
}

export async function atualizarUsuario(id: string, data: UpdateUsuarioInput) {
  await connectDB()
  const payload: Record<string, unknown> = { ...data }
  if (data.senha) {
    payload.senha = await bcrypt.hash(data.senha, 10)
  }
  return Usuario.findByIdAndUpdate(id, payload, { new: true }).select("-senha").lean()
}

export async function desativarUsuario(id: string) {
  await connectDB()
  return Usuario.findByIdAndUpdate(id, { ativo: false }, { new: true }).select("-senha").lean()
}
```

- [ ] **Step 4: Rodar testes e verificar que passam**

```bash
npm test -- __tests__/services/usuario.service.test.ts
```

Expected: PASS — 6 testes passando.

- [ ] **Step 5: Commit**

```bash
git add lib/services/usuario.service.ts __tests__/services/
git commit -m "feat: add usuario service with tests"
```

---

### Task 9: API Routes de usuários

**Files:**
- Create: `app/api/usuarios/route.ts`
- Create: `app/api/usuarios/[id]/route.ts`

- [ ] **Step 1: Criar `app/api/usuarios/route.ts`**

```ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { listarUsuarios, criarUsuario } from "@/lib/services/usuario.service"

export async function GET() {
  const session = await auth()
  if (!session?.user.perfis.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const usuarios = await listarUsuarios()
  return NextResponse.json(usuarios)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user.perfis.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  try {
    const body = await req.json()
    const usuario = await criarUsuario(body)
    return NextResponse.json(usuario, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
```

- [ ] **Step 2: Criar `app/api/usuarios/[id]/route.ts`**

```ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  buscarUsuarioPorId,
  atualizarUsuario,
  desativarUsuario,
} from "@/lib/services/usuario.service"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user.perfis.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { id } = await params
  const usuario = await buscarUsuarioPorId(id)
  if (!usuario) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json(usuario)
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user.perfis.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const usuario = await atualizarUsuario(id, body)
  if (!usuario) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json(usuario)
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user.perfis.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { id } = await params
  await desativarUsuario(id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/usuarios/
git commit -m "feat: add usuarios API routes"
```

---

### Task 10: UI da página Equipe

**Files:**
- Create: `app/(dashboard)/page.tsx`
- Create: `app/(dashboard)/equipe/page.tsx`
- Create: `components/equipe/UsuarioForm.tsx`

- [ ] **Step 1: Criar `app/(dashboard)/page.tsx` (placeholder)**

```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
      <p className="text-zinc-400">Em breve — implementado no Plano 4.</p>
    </div>
  )
}
```

- [ ] **Step 2: Criar `components/equipe/UsuarioForm.tsx`**

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

type Perfil = "admin" | "atendente" | "tecnico"

type UsuarioFormProps = {
  onSalvo: () => void
  onCancelar: () => void
}

export function UsuarioForm({ onSalvo, onCancelar }: UsuarioFormProps) {
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)

  function togglePerfil(p: Perfil) {
    setPerfis((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro("")
    if (perfis.length === 0) {
      setErro("Selecione ao menos um perfil.")
      return
    }
    setCarregando(true)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: form.get("nome"),
        email: form.get("email"),
        senha: form.get("senha"),
        perfis,
        comissao_pct: perfis.includes("tecnico")
          ? Number(form.get("comissao_pct"))
          : 0,
      }),
    })
    setCarregando(false)
    if (!res.ok) {
      const data = await res.json()
      setErro(data.error ?? "Erro ao salvar.")
      return
    }
    onSalvo()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input name="nome" required className="bg-zinc-800 border-zinc-700 text-white" />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input name="email" type="email" required className="bg-zinc-800 border-zinc-700 text-white" />
      </div>
      <div className="space-y-2">
        <Label>Senha inicial</Label>
        <Input name="senha" type="password" required minLength={6} className="bg-zinc-800 border-zinc-700 text-white" />
      </div>
      <div className="space-y-2">
        <Label>Perfis</Label>
        <div className="flex gap-4">
          {(["admin", "atendente", "tecnico"] as Perfil[]).map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <Checkbox
                checked={perfis.includes(p)}
                onCheckedChange={() => togglePerfil(p)}
              />
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </label>
          ))}
        </div>
      </div>
      {perfis.includes("tecnico") && (
        <div className="space-y-2">
          <Label>Comissão (%)</Label>
          <Input
            name="comissao_pct"
            type="number"
            min={0}
            max={100}
            defaultValue={0}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
      )}
      {erro && <p className="text-red-400 text-sm">{erro}</p>}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={carregando}>
          {carregando ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Criar `app/(dashboard)/equipe/page.tsx`**

```tsx
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { UsuarioForm } from "@/components/equipe/UsuarioForm"
import { UserPlus } from "lucide-react"

type Usuario = {
  _id: string
  nome: string
  email: string
  perfis: string[]
  comissao_pct: number
  ativo: boolean
}

export default function EquipePage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [abrirForm, setAbrirForm] = useState(false)

  async function carregar() {
    const res = await fetch("/api/usuarios")
    const data = await res.json()
    setUsuarios(data)
  }

  useEffect(() => { carregar() }, [])

  async function desativar(id: string) {
    await fetch(`/api/usuarios/${id}`, { method: "DELETE" })
    carregar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Equipe</h1>
        <Button onClick={() => setAbrirForm(true)}>
          <UserPlus size={16} className="mr-2" />
          Novo usuário
        </Button>
      </div>

      <div className="grid gap-3">
        {usuarios.map((u) => (
          <Card key={u._id} className="bg-zinc-900 border-zinc-800">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium text-white">{u.nome}</p>
                <p className="text-sm text-zinc-400">{u.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {u.perfis.map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs capitalize">
                      {p}
                    </Badge>
                  ))}
                </div>
                {u.perfis.includes("tecnico") && (
                  <span className="text-xs text-zinc-400">{u.comissao_pct}%</span>
                )}
                {u.ativo ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => desativar(u._id)}
                  >
                    Desativar
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-zinc-500">Inativo</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={abrirForm} onOpenChange={setAbrirForm}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Novo usuário</DialogTitle>
          </DialogHeader>
          <UsuarioForm
            onSalvo={() => { setAbrirForm(false); carregar() }}
            onCancelar={() => setAbrirForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/ components/equipe/
git commit -m "feat: add equipe page and user management UI"
```

---

### Task 11: Seed do admin inicial

**Files:**
- Create: `scripts/seed.ts`

- [ ] **Step 1: Criar `scripts/seed.ts`**

```ts
import mongoose from "mongoose"
import bcrypt from "bcryptjs"

const MONGODB_URI = process.env.MONGODB_URI!

async function seed() {
  await mongoose.connect(MONGODB_URI)

  // Importação dinâmica para evitar problema de modelo duplicado
  const { default: Usuario } = await import("../models/Usuario")

  const existente = await Usuario.findOne({ email: "admin@techcode.com" })
  if (existente) {
    console.log("Admin já existe.")
    await mongoose.disconnect()
    return
  }

  const hash = await bcrypt.hash("admin123", 10)
  await Usuario.create({
    nome: "Administrador",
    email: "admin@techcode.com",
    senha: hash,
    perfis: ["admin"],
    comissao_pct: 0,
    ativo: true,
  })

  console.log("Admin criado: admin@techcode.com / admin123")
  console.log("IMPORTANTE: troque a senha após o primeiro login.")
  await mongoose.disconnect()
}

seed().catch(console.error)
```

- [ ] **Step 2: Adicionar script no `package.json`**

```json
"scripts": {
  "seed": "tsx scripts/seed.ts"
}
```

- [ ] **Step 3: Instalar tsx**

```bash
npm install -D tsx
```

- [ ] **Step 4: Rodar o seed**

```bash
MONGODB_URI="sua_uri_aqui" npm run seed
```

No Windows PowerShell:
```powershell
$env:MONGODB_URI="sua_uri_aqui"; npm run seed
```

Expected: `Admin criado: admin@techcode.com / admin123`

- [ ] **Step 5: Rodar o servidor de dev e testar login**

```bash
npm run dev
```

Abra http://localhost:3000 — deve redirecionar para /login. Entre com `admin@techcode.com` / `admin123`. Deve redirecionar para o dashboard com sidebar visível.

- [ ] **Step 6: Commit final**

```bash
git add scripts/ package.json
git commit -m "chore: add seed script for initial admin user"
```

---

## Checklist de Self-Review

- [x] Auth protege todas as rotas via middleware
- [x] Senha nunca retornada nas queries (`.select("-senha")`)
- [x] Roles verificados tanto no middleware quanto nas API routes
- [x] `connectDB()` chamado em todo service antes de usar o Mongoose
- [x] Modelos com `mongoose.models.X || mongoose.model(...)` para evitar re-registro em hot reload
- [x] Seed não duplica o admin se já existir
- [x] Mobile: sidebar substituída por bottom nav
- [x] Comissão % só aparece no form quando perfil "tecnico" está selecionado
