# Deploy no Coolify (VPS) — teccode.satriz.club

Terceira hospedagem do projeto, ao lado de Vercel e Render. Nada aqui desliga as
outras: todas as três apontam para o **mesmo cluster MongoDB Atlas**.

## Recursos necessários

Um único recurso no Coolify: a aplicação Next.js. **Não** é preciso criar banco —
o Atlas é externo e compartilhado com os deploys atuais.

## Configuração da aplicação

| Campo | Valor |
|---|---|
| Tipo | Application → Dockerfile |
| Repositório | `github.com/devasafe/techcode` (GitHub App já conectada na VPS) |
| Branch | `master` |
| Base Directory | `/` |
| Dockerfile | `Dockerfile` (raiz) |
| Porta exposta | `3000` |
| Domínio | `https://teccode.satriz.club` |

## Variáveis de ambiente

Todas **runtime** — nenhuma é necessária no build, porque o projeto não tem
`NEXT_PUBLIC_*` e o `connectDB()` só lê `MONGODB_URI` dentro da função.

| Variável | Origem |
|---|---|
| `MONGODB_URI` | copiar do painel da **Vercel** (Settings → Environment Variables, Production). O `.env.local` está com credencial antiga e dá `bad auth`. |
| `AUTH_SECRET` | pode ser a mesma da Vercel, ou nova (`openssl rand -base64 32`). Trocar apenas invalida as sessões abertas. |
| `NEXTAUTH_URL` | `https://teccode.satriz.club` — **obrigatório e específico deste domínio** |
| `CLOUDINARY_CLOUD_NAME` | painel da Vercel |
| `CLOUDINARY_API_KEY` | painel da Vercel |
| `CLOUDINARY_API_SECRET` | painel da Vercel |

## Cloudflare

Registro `A` para `teccode` → `82.112.245.68`, em **DNS only (nuvem cinza)**.
Com a nuvem laranja o Let's Encrypt do Traefik não valida e o domínio serve o
certificado default do Traefik.

## Armadilhas já pagas em outros projetos desta VPS

1. **Salvar o domínio não basta — precisa `Redeploy`.** Sem isso o Traefik não
   cria a rota e o domínio responde `no available server` ou serve o
   `TRAEFIK DEFAULT CERT`.
2. **Env com `$` no valor chega VAZIA no container** (o Coolify interpola como
   variável de shell). Se alguma senha tiver `$`, marcar **"Is Literal"** e
   redeployar. `MONGODB_URI` com senha contendo `$` é o caso a vigiar aqui.
3. **`NEXTAUTH_URL` errada não derruba o app** — ele sobe normal e só o
   redirect do login vai para o domínio errado. Conferir depois do primeiro deploy.
4. **IP allowlist do Atlas:** se o cluster não estiver em `0.0.0.0/0`, liberar
   `82.112.245.68`, senão o login falha com `MongoServerError`. Mesmo tipo de
   bloqueio que o Brevo aplicou ao IP novo desta VPS.
5. **O container é `node:22-bookworm-slim` e não tem `curl`.** Para testar de
   dentro, usar `node -e` com o fetch nativo.

## Por que o `trustHost: true` importa aqui

Está em `auth.config.ts` desde agosto. Sem ele, o Auth.js v5 recusa o host
atrás de um proxy reverso (`UntrustedHost` em `/api/auth/session`) — foi o que
quebrou o Render e quebraria o Traefik do Coolify da mesma forma.

## Validação pós-deploy

```
GET  https://teccode.satriz.club/login             -> 200
GET  https://teccode.satriz.club/api/auth/providers -> credentials, signinUrl com o domínio certo
POST /api/auth/callback/credentials (credencial falsa) -> error=CredentialsSignin
```

O último é o que prova que o Mongo conectou: `error=Configuration` significa
exceção no `authorize`, e quase sempre é `MONGODB_URI` inválida.
