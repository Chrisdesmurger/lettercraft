import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const file = form.get('file') as Blob | null
    if (!file || typeof (file as any).arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    }

    const uploaded = await openai.files.create({
      file: file as any,
      purpose: 'assistants',
    })

    const prompt = `Extract the following information in JSON:\n- first_name\n- last_name\n- experiences (array)\n- skills (array)\n- education (array)`

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'file', file_id: uploaded.id } as any,
          ],
        },
      ],
      temperature: 0,
    })

    const content = completion.choices[0].message?.content || '{}'
    const data = JSON.parse(content)

    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erreur lors de l'extraction" }, { status: 500 })
  }
}

