import { NextRequest, NextResponse } from 'next/server'
import { brevoContacts, syncUserToBrevo, bulkSyncUsersToBrevo, updateContactLists, syncAllContactLists, createMissingContacts } from '@/lib/brevo-contacts'

interface SyncContactRequest {
  userId?: string
  userIds?: string[]
  email?: string
  firstName?: string
  lastName?: string
  language?: string
  listIds?: number[]
  action: 'create' | 'update' | 'delete' | 'bulk' | 'sync' | 'update-lists' | 'sync-all-lists' | 'create-missing'
}

export async function POST(request: NextRequest) {
  try {
    console.log('📧 [API] Synchronisation contact Brevo demandée')

    const body: SyncContactRequest = await request.json()
    const { userId, userIds, email, firstName, lastName, language, listIds, action } = body

    // Validation des paramètres
    if (!action) {
      return NextResponse.json(
        { error: 'Action requise' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'create':
      case 'update':
        if (!userId && !email) {
          return NextResponse.json(
            { error: 'userId ou email requis pour create/update' },
            { status: 400 }
          )
        }

        if (userId) {
          // Synchronisation complète depuis la base de données
          console.log(`🔄 Synchronisation utilisateur ${userId}`)
          const success = await syncUserToBrevo(userId)
          
          return NextResponse.json({
            success,
            message: success 
              ? 'Contact synchronisé avec succès' 
              : 'Échec de la synchronisation'
          })
        } else if (email) {
          // Synchronisation rapide avec les données fournies
          console.log(`🔄 Synchronisation contact ${email}`)
          
          const contactData = {
            email,
            attributes: {
              FIRSTNAME: firstName || '',
              LASTNAME: lastName || '',
              LANGUAGE: language || 'fr',
              REGISTRATION_DATE: new Date().toISOString(),
              PROFILE_COMPLETE: !!(firstName && lastName)
            },
            updateEnabled: true
          }

          const result = await brevoContacts.createOrUpdateContact(contactData)
          
          return NextResponse.json({
            success: !!result,
            contactId: result?.id,
            message: result 
              ? 'Contact créé/mis à jour avec succès' 
              : 'Échec de la création/mise à jour'
          })
        }
        break

      case 'delete':
        if (!email) {
          return NextResponse.json(
            { error: 'Email requis pour delete' },
            { status: 400 }
          )
        }

        console.log(`🗑️ Suppression contact ${email}`)
        const deleteSuccess = await brevoContacts.deleteContact(email)
        
        return NextResponse.json({
          success: deleteSuccess,
          message: deleteSuccess 
            ? 'Contact supprimé avec succès' 
            : 'Échec de la suppression'
        })

      case 'bulk':
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
          return NextResponse.json(
            { error: 'userIds requis pour bulk (array)' },
            { status: 400 }
          )
        }

        console.log(`🔄 Synchronisation en lot de ${userIds.length} utilisateurs`)
        const bulkResult = await bulkSyncUsersToBrevo(userIds)
        
        return NextResponse.json({
          success: bulkResult.success > 0,
          ...bulkResult,
          message: `${bulkResult.success} contacts synchronisés, ${bulkResult.failed} échecs`
        })

      case 'sync':
        if (userId) {
          // Synchronisation d'un utilisateur spécifique
          const syncSuccess = await syncUserToBrevo(userId)
          return NextResponse.json({
            success: syncSuccess,
            message: syncSuccess 
              ? 'Utilisateur synchronisé avec succès' 
              : 'Échec de la synchronisation'
          })
        } else {
          return NextResponse.json(
            { error: 'userId requis pour sync' },
            { status: 400 }
          )
        }

      case 'update-lists':
        if (!email || !listIds || !Array.isArray(listIds)) {
          return NextResponse.json(
            { error: 'email et listIds (array) requis pour update-lists' },
            { status: 400 }
          )
        }

        console.log(`📋 Mise à jour des listes pour le contact ${email}`)
        const updateListsSuccess = await updateContactLists(email, listIds)
        
        return NextResponse.json({
          success: updateListsSuccess,
          message: updateListsSuccess 
            ? `Listes mises à jour pour ${email}` 
            : 'Échec de la mise à jour des listes'
        })

      case 'sync-all-lists':
        console.log(`🔄 Synchronisation de toutes les listes de contacts`)
        const syncAllResult = await syncAllContactLists()
        
        return NextResponse.json({
          success: syncAllResult.updated > 0,
          ...syncAllResult,
          message: `${syncAllResult.updated} contacts mis à jour, ${syncAllResult.failed} échecs`
        })

      case 'create-missing':
        console.log(`➕ Création de tous les contacts manquants dans Brevo`)
        const createMissingResult = await createMissingContacts()
        
        return NextResponse.json({
          success: createMissingResult.created > 0 || createMissingResult.already_exists > 0,
          ...createMissingResult,
          message: `${createMissingResult.created} contacts créés, ${createMissingResult.already_exists} existants, ${createMissingResult.failed} échecs`
        })

      default:
        return NextResponse.json(
          { error: `Action non supportée: ${action}` },
          { status: 400 }
        )
    }

    return NextResponse.json(
      { error: 'Paramètres invalides' },
      { status: 400 }
    )

  } catch (error) {
    console.error('❌ [API] Erreur synchronisation contact:', error)
    
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      )
    }

    console.log(`🔍 Récupération contact Brevo: ${email}`)
    const contact = await brevoContacts.getContact(email)

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      contact
    })

  } catch (error) {
    console.error('❌ [API] Erreur récupération contact:', error)
    
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}