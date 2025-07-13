import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    if (!text) {
      return NextResponse.json({ error: 'Texte manquant' }, { status: 400 })
    }

    const prompt = `
      Extract the following information in JSON:
      - first_name
      - last_name
      - experiences (array)
      - skills (array)
      - education (array)
      Resume text:
      ${text}
    `

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0
    })

    const content = completion.choices[0].message?.content || '{}'
    const data = JSON.parse(content)

    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erreur lors de l'extraction" }, { status: 500 })
  }
}

