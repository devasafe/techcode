import mongoose from "mongoose"

let cached = (global as any).mongoose ?? { conn: null, promise: null }
;(global as any).mongoose = cached

export async function connectDB() {
  // If already connected (e.g. via jest.setup.ts in tests), reuse the connection
  if (cached.conn) return cached.conn

  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose.connection
    return cached.conn
  }

  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI não definida em .env.local")
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false })
      .catch((err) => {
        cached.promise = null  // permite retry na próxima requisição
        throw err
      })
  }

  cached.conn = await cached.promise
  return cached.conn
}
