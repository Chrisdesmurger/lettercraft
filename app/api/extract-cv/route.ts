import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  console.log('🔍 [CV-EXTRACT] Starting CV extraction...');
  
  try {
    console.log('🔍 [CV-EXTRACT] Parsing form data...');
    const form = await request.formData();
    const file = form.get('file') as File | null;

    console.log('🔍 [CV-EXTRACT] File received:', {
      name: file?.name,
      size: file?.size,
      type: file?.type
    });

    if (!file || typeof file.arrayBuffer !== 'function') {
      console.log('❌ [CV-EXTRACT] File validation failed');
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
    }

    console.log('🔍 [CV-EXTRACT] Converting file to buffer...');
    const buffer = Buffer.from(await file.arrayBuffer());
    const tempFilePath = path.join(os.tmpdir(), file.name);

    console.log('🔍 [CV-EXTRACT] Writing temp file:', tempFilePath);
    fs.writeFileSync(tempFilePath, new Uint8Array(buffer));

    console.log('🔍 [CV-EXTRACT] Creating OpenAI assistant...');
    // Utiliser l'Assistants API avec file_search pour traiter le PDF
    const assistant = await openai.beta.assistants.create({
      name: "CV Extractor",
      instructions: `Extract information from the CV and return ONLY a valid JSON object with these fields:
{
  "first_name": "string or null",
  "last_name": "string or null",
  "experiences": ["array of experience descriptions"],
  "skills": ["array of skills"],
  "education": ["array of education/qualifications"]
}
Return only the JSON, no other text.`,
      model: "gpt-4-turbo",
      tools: [{ type: "file_search" }]
    });

    console.log('🔍 [CV-EXTRACT] Uploading file to OpenAI...');
    const uploadedFile = await openai.files.create({
      file: fs.createReadStream(tempFilePath),
      purpose: "assistants",
    });
    console.log('✅ [CV-EXTRACT] File uploaded:', uploadedFile.id);

    console.log('🔍 [CV-EXTRACT] Creating thread...');
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: "Extract the information from this CV according to the instructions.",
          attachments: [{ file_id: uploadedFile.id, tools: [{ type: "file_search" }] }]
        }
      ]
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
    });

    // Attendre la completion
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status === "in_progress" || runStatus.status === "queued") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];
    const content = lastMessage.content[0];
    
    let responseText = '';
    if (content.type === 'text') {
      responseText = content.text.value;
    }

    // Nettoyage OpenAI
    await openai.files.del(uploadedFile.id);
    await openai.beta.assistants.del(assistant.id);

    // Parser la réponse JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      // Fallback: extraire JSON de la réponse si elle contient du texte supplémentaire
      const jsonMatch = responseText.match(/\{.*\}/s);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      } else {
        // Si aucun JSON valide, utiliser des valeurs par défaut
        data = {
          first_name: null,
          last_name: null,
          experiences: [],
          skills: [],
          education: []
        };
      }
    }

    fs.unlinkSync(tempFilePath);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ [CV-EXTRACT] Error occurred:', error);
    
    // Log plus détaillé de l'erreur
    if (error instanceof Error) {
      console.error('❌ [CV-EXTRACT] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    // Nettoyage en cas d'erreur si le fichier temp existe
    try {
      const tempFilePath = path.join(os.tmpdir(), 'temp_cv_file');
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        console.log('🧹 [CV-EXTRACT] Temp file cleaned up after error');
      }
    } catch (cleanupError) {
      console.warn('⚠️ [CV-EXTRACT] Could not clean up temp file:', cleanupError);
    }
    
    return NextResponse.json({ 
      error: "Erreur lors de l'extraction",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}