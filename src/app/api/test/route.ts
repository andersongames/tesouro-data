import { getTesouroData } from "@/app/lib/services/tesouro.service"

export async function GET() {
  const data = await getTesouroData()

  return Response.json({
    total: data.length,
    sample: data.slice(0, 2),
  })
}