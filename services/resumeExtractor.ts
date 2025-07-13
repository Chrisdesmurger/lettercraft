import Tesseract from 'tesseract.js'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry'

GlobalWorkerOptions.workerSrc = pdfjsWorker

export interface ExtractedProfile {
  first_name?: string
  last_name?: string
  experiences?: string[]
  skills?: string[]
  education?: string[]
}

export async function extractResumeDataFromFile(file: File): Promise<ExtractedProfile> {
  let text = ''
  if (file.name.endsWith('.txt')) {
    text = await file.text()
  } else if (file.name.endsWith('.pdf')) {
    text = await extractPdfText(file)
  } else {
    const { data } = await Tesseract.recognize(file, 'fra+eng')
    text = data.text
  }

  const res = await fetch('/api/extract-cv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error('extraction failed')
  return (await res.json()) as ExtractedProfile
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
    text += '\n'
  }
  return text
}
