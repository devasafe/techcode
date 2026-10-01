import { createHmac } from "crypto"
import { assinaturaConfere, sanitizarNomePerfil } from "@/lib/whatsapp/assinatura"

const SECRET = "segredo-do-app-de-teste"
const CORPO = '{"object":"whatsapp_business_account","entry":[{"id":"1"}]}'

function assinar(corpo: string, secret = SECRET) {
  return "sha256=" + createHmac("sha256", secret).update(corpo, "utf8").digest("hex")
}

describe("assinaturaConfere", () => {
  it("aceita assinatura correta", () => {
    expect(assinaturaConfere(CORPO, assinar(CORPO), SECRET)).toBe(true)
  })

  it("recusa quando UM BYTE do corpo muda", () => {
    const assinatura = assinar(CORPO)
    const corpoAlterado = CORPO.replace('"1"', '"2"')
    expect(assinaturaConfere(corpoAlterado, assinatura, SECRET)).toBe(false)
  })

  it("recusa assinatura feita com outro segredo", () => {
    expect(assinaturaConfere(CORPO, assinar(CORPO, "outro-segredo"), SECRET)).toBe(false)
  })

  it("recusa header ausente SEM lançar", () => {
    expect(() => assinaturaConfere(CORPO, null, SECRET)).not.toThrow()
    expect(assinaturaConfere(CORPO, null, SECRET)).toBe(false)
  })

  it("recusa header de tamanho errado SEM lançar", () => {
    // timingSafeEqual lança quando os buffers diferem em tamanho. Sem a
    // checagem prévia, isto viraria 500 — e 500 faz a Meta reentregar por dias.
    expect(() => assinaturaConfere(CORPO, "sha256=abc", SECRET)).not.toThrow()
    expect(assinaturaConfere(CORPO, "sha256=abc", SECRET)).toBe(false)
  })

  it("recusa sem o prefixo sha256=", () => {
    const hex = createHmac("sha256", SECRET).update(CORPO, "utf8").digest("hex")
    expect(assinaturaConfere(CORPO, hex, SECRET)).toBe(false)
  })

  it("recusa header com caractere nao-hex do tamanho certo", () => {
    expect(assinaturaConfere(CORPO, "sha256=" + "z".repeat(64), SECRET)).toBe(false)
  })

  it("recusa quando falta o app secret", () => {
    expect(assinaturaConfere(CORPO, assinar(CORPO), "")).toBe(false)
  })

  it("aceita maiusculas no hex", () => {
    expect(assinaturaConfere(CORPO, assinar(CORPO).toUpperCase().replace("SHA256=", "sha256="), SECRET)).toBe(true)
  })

  it("corpo vazio com assinatura do corpo vazio confere", () => {
    expect(assinaturaConfere("", assinar(""), SECRET)).toBe(true)
  })
})

describe("sanitizarNomePerfil", () => {
  it("aceita nome normal", () => {
    expect(sanitizarNomePerfil("Zé Elétrica")).toBe("Zé Elétrica")
  })

  it("remove caractere de controle", () => {
    expect(sanitizarNomePerfil("Ze\u0000\u001Fnome")).toBe("Ze nome")
  })

  it("corta em 80 caracteres", () => {
    expect(sanitizarNomePerfil("a".repeat(200))).toHaveLength(80)
  })

  it("devolve undefined para vazio, espaco ou tipo errado", () => {
    expect(sanitizarNomePerfil("")).toBeUndefined()
    expect(sanitizarNomePerfil("   ")).toBeUndefined()
    expect(sanitizarNomePerfil(undefined)).toBeUndefined()
    expect(sanitizarNomePerfil(123)).toBeUndefined()
    expect(sanitizarNomePerfil({ nome: "x" })).toBeUndefined()
  })

  it("colapsa espacos repetidos", () => {
    expect(sanitizarNomePerfil("  Ze    da   Eletrica  ")).toBe("Ze da Eletrica")
  })
})
