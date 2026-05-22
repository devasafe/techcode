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
