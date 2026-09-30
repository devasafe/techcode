import Central from "@/models/Central"

describe("Central model", () => {
  it("aceita peca sem marca, modelo nem codigo (etiqueta ilegivel)", async () => {
    const central = await Central.create({ apelido: "painel Gol 2010 chicote diferente" })
    expect(central.apelido).toBe("painel Gol 2010 chicote diferente")
    // Default é "confirmada": esconder é opt-in, para nada sumir por acidente.
    expect(central.status_catalogo).toBe("confirmada")
  })

  it("aceita peca completa e continua valendo", async () => {
    const central = await Central.create({
      marca: "Bosch",
      modelo: "4GV",
      codigo: "0261s04",
      status_catalogo: "confirmada",
    })
    expect(central.codigo).toBe("0261S04")
    expect(central.status_catalogo).toBe("confirmada")
  })

  it("origem default e manual e created_at e preenchido", async () => {
    const central = await Central.create({ apelido: "teste" })
    expect(central.origem).toBe("manual")
    expect(central.created_at).toBeInstanceOf(Date)
  })
})
