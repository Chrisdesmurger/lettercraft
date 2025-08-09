import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabase } from '@/lib/supabase-client'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [UPLOAD-CV] Starting CV upload...')

    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ [UPLOAD-CV] Auth error:', authError)
      return NextResponse.json(
        { error: 'Authentification invalide' },
        { status: 401 }
      )
    }

    console.log('✅ [UPLOAD-CV] User authenticated:', user.email)

    // Parse le FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Fichier manquant' },
        { status: 400 }
      )
    }

    console.log('🔍 [UPLOAD-CV] File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    // Valider le type de fichier
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non supporté. Utilisez PDF, JPEG ou PNG.' },
        { status: 400 }
      )
    }

    // Valider la taille (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux. Maximum 10MB.' },
        { status: 400 }
      )
    }

    // Générer le nom de fichier
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/cv-${Date.now()}.${fileExt}`

    console.log('🔍 [UPLOAD-CV] Uploading to Storage:', fileName)

    // Convertir le File en Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload vers Supabase Storage via client admin (évite CORS car côté serveur)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('❌ [UPLOAD-CV] Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload: ' + uploadError.message },
        { status: 500 }
      )
    }

    console.log('✅ [UPLOAD-CV] File uploaded successfully:', uploadData.path)

    // Retourner les informations d'upload avec headers CORS
    const response = NextResponse.json({
      success: true,
      data: {
        path: uploadData.path,
        fileName: file.name,
        size: file.size,
        type: file.type
      }
    })

    // Ajouter headers CORS
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    return response

  } catch (error) {
    console.error('❌ [UPLOAD-CV] Unexpected error:', error)
    const errorResponse = NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )

    // Ajouter headers CORS même en cas d'erreur
    errorResponse.headers.set('Access-Control-Allow-Origin', '*')
    errorResponse.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    return errorResponse
  }
}

// Gestion des requêtes preflight CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

// Méthodes non supportées
export async function GET() {
  const response = NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  return response
}

export async function PUT() {
  const response = NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  return response
}