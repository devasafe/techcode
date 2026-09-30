import { normalizarE164, formatarBR, parecTelefone } from "@/lib/telefone"

describe("normalizarE164", () => {
  const equivalentes = [
    "11999990000",
    "(11) 99999-0000",
    "11 99999 0000",
    "+55 11 99999-0000",
    "5511999990000",
    "005511999990000",
  ]

  it.each(equivalentes)("normaliza %s para o mesmo E.164", (entrada) => {
    expect(normalizarE164(entrada)).toBe("+5511999990000")
  })

  it("aceita fixo de 8 digitos", () => {
    expect(normalizarE164("1133334444")).toBe("+551133334444")
  })

  it("insere o 9 em celular antigo de 8 digitos", () => {
    expect(normalizarE164("1188884444")).toBe("+5511988884444")
  })

  it.each([
    ["vazio", ""],
    ["nulo", null],
    ["nome", "Maria Silva"],
    ["curto demais", "99999"],
    ["sem DDD", "999990000"],
    ["longo demais", "11999990000123"],
  ])("rejeita %s", (_label, entrada) => {
    expect(normalizarE164(entrada as string)).toBeNull()
  })
})

describe("formatarBR", () => {
  it("formata celular", () => {
    expect(formatarBR("+5511999990000")).toBe("(11) 99999-0000")
  })
  it("formata fixo", () => {
    expect(formatarBR("+551133334444")).toBe("(11) 3333-4444")
  })
  it("devolve vazio para nulo", () => {
    expect(formatarBR(null)).toBe("")
  })
})

describe("parecTelefone", () => {
  it("reconhece numero digitado", () => {
    expect(parecTelefone("11999990000")).toBe(true)
    expect(parecTelefone("(11) 99999-0000")).toBe(true)
  })
  it("nao confunde com nome", () => {
    expect(parecTelefone("Zé da Elétrica")).toBe(false)
    expect(parecTelefone("gol")).toBe(false)
  })
})
