import {
  registrarEvento,
  processarPayload,
  marcarProcessado,
  marcarErro,
  listarNaoProcessados,
} from "@/lib/services/webhook.service"
import { webhookSchema, extrairMensagens } from "@/lib/schemas/whatsapp"
import WebhookEvento from "@/models/WebhookEvento"
import Cliente from "@/models/Cliente"

/** Payload de mensagem recebida, no formato que a Meta documenta. */
function payloadMensagem(opts: {
  id?: string
  wa_id?: string
  nome?: unknown
  tipo?: string
  texto?: string
} = {}) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_ID",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "5522999999999", phone_number_id: "PNID" },
              contacts: [
                {
                  wa_id: opts.wa_id ?? "5522988887777",
                  ...(opts.nome !== undefined ? { profile: { name: opts.nome } } : {}),
                },
              ],
              messages: [
                {
                  id: opts.id ?? "wamid.TESTE1",
                  from: opts.wa_id ?? "5522988887777",
                  timestamp: "1790000000",
                  type: opts.tipo ?? "text",
                  text: { body: opts.texto ?? "bom dia, vou levar uma peça" },
                },
              ],
            },
          },
        ],
      },
    ],
  }
}

/** Contato compartilhado (vCard) — o cadastro sem coexistência. */
function payloadContato(opts: { id?: string; nome?: string; telefone?: string } = {}) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_ID",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: "PNID" },
              contacts: [{ wa_id: "5522911112222", profile: { name: "Operador" } }],
              messages: [
                {
                  id: opts.id ?? "wamid.CONTATO1",
                  from: "5522911112222",
                  type: "contacts",
                  contacts: [
                    {
                      name: { formatted_name: opts.nome ?? "Oficina do Zé" },
                      phones: [
                        {
                          phone: "+55 22 98888-7777",
                          wa_id: opts.telefone ?? "5522988887777",
                          type: "MOBILE",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
  }
}

describe("registrarEvento (deduplicacao)", () => {
  it("registra evento novo", async () => {
    const r = await registrarEvento("wamid.A", { payload: {} })
    expect(r.novo).toBe(true)
    expect(await WebhookEvento.countDocuments()).toBe(1)
  })

  it("mesmo message_id duas vezes registra UMA vez", async () => {
    await registrarEvento("wamid.A", { payload: {} })
    const segundo = await registrarEvento("wamid.A", { payload: {} })
    expect(segundo.novo).toBe(false)
    expect(await WebhookEvento.countDocuments()).toBe(1)
  })

  it("nao duplica em entregas simultaneas", async () => {
    // A Meta reentrega por 7 dias; sem isso, um erro viraria uma semana de
    // clientes duplicados.
    const rs = await Promise.all([
      registrarEvento("wamid.CONCORRENTE", { payload: {} }),
      registrarEvento("wamid.CONCORRENTE", { payload: {} }),
      registrarEvento("wamid.CONCORRENTE", { payload: {} }),
    ])
    expect(rs.filter((r) => r.novo)).toHaveLength(1)
    expect(await WebhookEvento.countDocuments()).toBe(1)
  })
})

describe("processarPayload: mensagem comum", () => {
  it("cria cliente a partir de quem escreveu", async () => {
    await processarPayload(webhookSchema.parse(payloadMensagem({ nome: "Zé Elétrica" })))
    const clientes = await Cliente.find()
    expect(clientes).toHaveLength(1)
    expect(clientes[0].nome).toBe("Zé Elétrica")
    expect(clientes[0].telefone_e164).toBe("+5522988887777")
    expect(clientes[0].origem).toBe("whatsapp")
  })

  it("sem nome de perfil, usa o telefone formatado", async () => {
    // `profile.name` é opcional na doc da Meta: pode simplesmente não vir.
    await processarPayload(webhookSchema.parse(payloadMensagem({})))
    const c = await Cliente.findOne()
    expect(c!.nome).toBe("(22) 98888-7777")
    expect(c!.nome_confirmado).toBe(false)
  })

  it("NAO sobrescreve nome que um humano confirmou", async () => {
    await Cliente.create({
      nome: "Oficina do Ze (confirmado)",
      telefone: "(22) 98888-7777",
      telefone_e164: "+5522988887777",
      nome_confirmado: true,
    })
    await processarPayload(webhookSchema.parse(payloadMensagem({ nome: "zezinho123" })))
    const c = await Cliente.findOne({ telefone_e164: "+5522988887777" })
    expect(c!.nome).toBe("Oficina do Ze (confirmado)")
    expect(await Cliente.countDocuments()).toBe(1)
  })

  it("sanitiza nome com caractere de controle", async () => {
    await processarPayload(webhookSchema.parse(payloadMensagem({ nome: "Ze\u0000\u001FEletrica" })))
    const c = await Cliente.findOne()
    expect(c!.nome).toBe("Ze Eletrica")
  })

  it("usa wa_id como chave, nao o nome", async () => {
    await processarPayload(webhookSchema.parse(payloadMensagem({ nome: "Primeiro" })))
    await processarPayload(
      webhookSchema.parse(payloadMensagem({ id: "wamid.OUTRA", nome: "Segundo" }))
    )
    // Mesmo wa_id com nome diferente continua sendo um cliente só.
    expect(await Cliente.countDocuments()).toBe(1)
  })

  it("telefone que nao normaliza nao quebra o processamento", async () => {
    await expect(
      processarPayload(webhookSchema.parse(payloadMensagem({ wa_id: "123" })))
    ).resolves.toBeDefined()
    expect(await Cliente.countDocuments()).toBe(0)
  })
})

describe("processarPayload: contato compartilhado", () => {
  it("cria cliente com nome E telefone do vCard", async () => {
    const r = await processarPayload(webhookSchema.parse(payloadContato({})))
    const c = await Cliente.findOne({ telefone_e164: "+5522988887777" })
    expect(c!.nome).toBe("Oficina do Zé")
    expect(c!.nome_confirmado).toBe(true) // veio nome de verdade, não o número
    expect(r.criados[0].via).toBe("contato")
  })

  it("nao cria cliente para quem compartilhou, so para o contato", async () => {
    await processarPayload(webhookSchema.parse(payloadContato({})))
    expect(await Cliente.countDocuments()).toBe(1)
    expect(await Cliente.findOne({ telefone_e164: "+5522911112222" })).toBeNull()
  })
})

describe("payload que nao interessa", () => {
  it("status de entrega e ignorado sem erro", async () => {
    const payload = webhookSchema.parse({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "W",
          changes: [{ field: "messages", value: { statuses: [{ id: "x", status: "delivered" }] } }],
        },
      ],
    })
    expect(extrairMensagens(payload)).toHaveLength(0)
    await processarPayload(payload)
    expect(await Cliente.countDocuments()).toBe(0)
  })

  it("campo desconhecido no payload nao quebra o parse", async () => {
    const bruto = payloadMensagem({ nome: "Ze" }) as Record<string, unknown>
    bruto.campo_que_a_meta_inventou = { foo: "bar" }
    expect(() => webhookSchema.parse(bruto)).not.toThrow()
  })
})

describe("fila de retentativa", () => {
  it("evento processado sai da fila, evento com erro fica", async () => {
    const a = await registrarEvento("wamid.OK", { payload: {} })
    const b = await registrarEvento("wamid.ERRO", { payload: {} })
    await marcarProcessado(a.evento_id!)
    await marcarErro(b.evento_id!, "mongo fora do ar")

    const fila = await listarNaoProcessados()
    expect(fila).toHaveLength(1)
    expect(fila[0].message_id).toBe("wamid.ERRO")
    expect(fila[0].tentativas).toBe(1)
  })

  it("evento com 3 tentativas sai da fila", async () => {
    const e = await registrarEvento("wamid.DESISTE", { payload: {} })
    for (let i = 0; i < 3; i++) await marcarErro(e.evento_id!, "falhou")
    expect(await listarNaoProcessados()).toHaveLength(0)
  })
})
