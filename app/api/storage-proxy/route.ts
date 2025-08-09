import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket')
    const path = searchParams.get('path')

    if (!bucket || !path) {
      return NextResponse.json(
        { error: 'Paramètres bucket et path requis' },
        { status: 400 }
      )
    }

    console.log(`📄 [STORAGE-PROXY] Fetching file: ${bucket}/${path}`)

    // Récupérer le fichier depuis Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .download(path)

    if (error) {
      console.error(`❌ [STORAGE-PROXY] Error downloading file:`, error)
      return NextResponse.json(
        { error: 'Fichier non trouvé ou inaccessible' },
        { status: 404 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Aucune donnée récupérée' },
        { status: 404 }
      )
    }

    // Convertir le Blob en ArrayBuffer puis en Buffer
    const arrayBuffer = await data.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Déterminer le type MIME basé sur l'extension du fichier
    const getMimeType = (filename: string): string => {
      const ext = filename.toLowerCase().split('.').pop()
      switch (ext) {
        case 'pdf':
          return 'application/pdf'
        case 'jpg':
        case 'jpeg':
          return 'image/jpeg'
        case 'png':
          return 'image/png'
        case 'gif':
          return 'image/gif'
        case 'webp':
          return 'image/webp'
        case 'svg':
          return 'image/svg+xml'
        case 'txt':
          return 'text/plain'
        case 'json':
          return 'application/json'
        default:
          return 'application/octet-stream'
      }
    }

    const mimeType = getMimeType(path)
    
    // Créer les headers appropriés
    const headers = new Headers({
      'Content-Type': mimeType,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'public, max-age=3600', // Cache 1 heure
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    })

    // Pour les PDFs, ajouter des headers pour l'affichage dans le navigateur
    if (mimeType === 'application/pdf') {
      headers.set('Content-Disposition', `inline; filename="${path.split('/').pop()}"`)
    }

    console.log(`✅ [STORAGE-PROXY] File served successfully: ${buffer.length} bytes`)

    return new NextResponse(buffer, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('❌ [STORAGE-PROXY] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Méthodes non supportées
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}