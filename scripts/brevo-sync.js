#!/usr/bin/env node

/**
 * Script utilitaire pour la synchronisation Brevo
 * Usage: node scripts/brevo-sync.js [action] [options]
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function syncContact(action, options = {}) {
  try {
    console.log(`🔄 Exécution de l'action: ${action}`)
    
    const response = await fetch(`${BASE_URL}/api/sync-contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        ...options
      })
    })

    const result = await response.json()
    
    if (!response.ok) {
      console.error('❌ Erreur:', result.error)
      if (result.details) {
        console.error('   Détails:', result.details)
      }
      return false
    }

    console.log('✅ Succès:', result.message)
    
    // Afficher les statistiques si disponibles
    if (result.created !== undefined) {
      console.log(`   📊 Créés: ${result.created}`)
    }
    if (result.already_exists !== undefined) {
      console.log(`   📊 Existants: ${result.already_exists}`)
    }
    if (result.updated !== undefined) {
      console.log(`   📊 Mis à jour: ${result.updated}`)
    }
    if (result.failed !== undefined) {
      console.log(`   📊 Échecs: ${result.failed}`)
    }
    if (result.contactId !== undefined) {
      console.log(`   📊 ID Contact: ${result.contactId}`)
    }

    return true
  } catch (error) {
    console.error('❌ Erreur réseau:', error.message)
    return false
  }
}

async function getContact(email) {
  try {
    console.log(`🔍 Récupération du contact: ${email}`)
    
    const response = await fetch(`${BASE_URL}/api/sync-contact?email=${encodeURIComponent(email)}`)
    const result = await response.json()
    
    if (!response.ok) {
      console.error('❌ Erreur:', result.error)
      return null
    }

    console.log('✅ Contact trouvé:')
    console.log('   📧 Email:', result.contact.email)
    console.log('   🆔 ID:', result.contact.id)
    console.log('   📊 Attributs:', JSON.stringify(result.contact.attributes, null, 2))
    
    return result.contact
  } catch (error) {
    console.error('❌ Erreur réseau:', error.message)
    return null
  }
}

// Actions disponibles
const actions = {
  'create-missing': {
    description: 'Créer tous les contacts manquants (migration initiale)',
    handler: () => syncContact('create-missing')
  },
  'sync-all-lists': {
    description: 'Synchroniser toutes les listes (maintenance)',
    handler: () => syncContact('sync-all-lists')
  },
  'sync-user': {
    description: 'Synchroniser un utilisateur spécifique',
    handler: (userId) => {
      if (!userId) {
        console.error('❌ Usage: sync-user <userId>')
        return false
      }
      return syncContact('sync', { userId })
    }
  },
  'create-contact': {
    description: 'Créer un nouveau contact',
    handler: (email, firstName, lastName, language = 'fr') => {
      if (!email || !firstName || !lastName) {
        console.error('❌ Usage: create-contact <email> <firstName> <lastName> [language]')
        return false
      }
      return syncContact('create', { email, firstName, lastName, language })
    }
  },
  'delete-contact': {
    description: 'Supprimer un contact',
    handler: (email) => {
      if (!email) {
        console.error('❌ Usage: delete-contact <email>')
        return false
      }
      return syncContact('delete', { email })
    }
  },
  'get-contact': {
    description: 'Récupérer les informations d\'un contact',
    handler: (email) => {
      if (!email) {
        console.error('❌ Usage: get-contact <email>')
        return false
      }
      return getContact(email)
    }
  },
  'bulk-sync': {
    description: 'Synchroniser plusieurs utilisateurs',
    handler: (...userIds) => {
      if (userIds.length === 0) {
        console.error('❌ Usage: bulk-sync <userId1> <userId2> ...')
        return false
      }
      return syncContact('bulk', { userIds })
    }
  },
  'update-lists': {
    description: 'Mettre à jour les listes d\'un contact',
    handler: (email, ...listIds) => {
      if (!email || listIds.length === 0) {
        console.error('❌ Usage: update-lists <email> <listId1> <listId2> ...')
        return false
      }
      const numericListIds = listIds.map(id => parseInt(id)).filter(id => !isNaN(id))
      if (numericListIds.length !== listIds.length) {
        console.error('❌ Tous les listIds doivent être des nombres')
        return false
      }
      return syncContact('update-lists', { email, listIds: numericListIds })
    }
  }
}

function showHelp() {
  console.log('🚀 Script utilitaire de synchronisation Brevo\n')
  console.log('Usage: node scripts/brevo-sync.js <action> [options]\n')
  console.log('Actions disponibles:\n')
  
  Object.entries(actions).forEach(([action, config]) => {
    console.log(`  ${action.padEnd(20)} - ${config.description}`)
  })
  
  console.log('\nExemples:')
  console.log('  node scripts/brevo-sync.js create-missing')
  console.log('  node scripts/brevo-sync.js sync-user abc-123-def')
  console.log('  node scripts/brevo-sync.js create-contact user@test.com Jean Dupont fr')
  console.log('  node scripts/brevo-sync.js get-contact user@test.com')
  console.log('  node scripts/brevo-sync.js update-lists user@test.com 1 2 4')
  console.log('  node scripts/brevo-sync.js bulk-sync uuid1 uuid2 uuid3')
  console.log('')
}

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    showHelp()
    return
  }

  const action = args[0]
  const options = args.slice(1)

  if (!actions[action]) {
    console.error(`❌ Action inconnue: ${action}`)
    console.error('   Utilisez "help" pour voir la liste des actions disponibles')
    process.exit(1)
  }

  console.log(`📧 Synchronisation Brevo - ${action}`)
  console.log(`🌐 URL de base: ${BASE_URL}`)
  console.log('')

  const success = await actions[action].handler(...options)
  
  console.log('')
  if (success !== false) {
    console.log('🎉 Opération terminée avec succès')
    process.exit(0)
  } else {
    console.log('💥 Opération échouée')
    process.exit(1)
  }
}

// Exécuter le script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Erreur fatale:', error.message)
    process.exit(1)
  })
}

module.exports = { syncContact, getContact, actions }