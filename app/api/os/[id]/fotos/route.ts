import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { connectDB } from "@/lib/db"
import { uploadArquivo, deletarArquivo } from "@/lib/cloudinary"
import OS from "@/models/OS"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const { id } = await params

    const formData = await req.formData()
    const arquivo = formData.get("foto") as File | null
    if (!arquivo) return NextResponse.json({ error: "Nenhuma foto enviada" }, { status: 400 })

    await connectDB()

    const buffer = Buffer.from(await arquivo.arrayBuffer())
    const { url } = await uploadArquivo(buffer, { pasta: `techcode/os/${id}`, resource_type: "image" })

    const os = await OS.findByIdAndUpdate(
      id,
      { $push: { fotos: url } },
      { new: true }
    ).lean()

    if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 })
    return NextResponse.json({ fotos: (os as { fotos?: string[] }).fotos ?? [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const { id } = await params

    const { url } = await req.json() as { url: string }
    if (!url) return NextResponse.json({ error: "URL obrigatória" }, { status: 400 })

    const match = url.match(/\/techcode\/os\/[^/]+\/([^.]+)/)
    const publicId = match ? `techcode/os/${id}/${match[1]}` : null

    if (publicId) {
      try { await deletarArquivo(publicId, "image") } catch { /* ignora */ }
    }

    await connectDB()
    const os = await OS.findByIdAndUpdate(
      id,
      { $pull: { fotos: url } },
      { new: true }
    ).lean()

    if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 })
    return NextResponse.json({ fotos: (os as { fotos?: string[] }).fotos ?? [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
