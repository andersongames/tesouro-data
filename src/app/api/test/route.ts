import { findTesouroTitulo, getTesouroData } from "@/app/lib/services/tesouro.service"

export async function GET() {
  // const data = await getTesouroData()

  // return Response.json({
  //   total: data.data.length,
  //   sample: data.data.slice(0, 2),
  // })

  const titulo = await findTesouroTitulo(
    "Tesouro Selic",
    "2028-03-01"
  )

  return Response.json(titulo)
}