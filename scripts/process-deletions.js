#!/usr/bin/env node

/**
 * Script de traitement des suppressions de comptes programmées
 * À exécuter via un cron job toutes les heures
 * 
 * Usage: node scripts/process-deletions.js
 * 
 * Variables d'environnement requises:
 * - ADMIN_SECRET: Secret d'administration
 * - NEXT_PUBLIC_APP_URL: URL de l'application
 */

const https = require('https')
const http = require('http')

const APP_URL = process.env.NEXT_PUBLIC_APP_URL
const ADMIN_SECRET = process.env.ADMIN_SECRET

if (!APP_URL || !ADMIN_SECRET) {
  console.error('❌ Variables d\'environnement manquantes:')
  console.error('- NEXT_PUBLIC_APP_URL:', APP_URL ? '✅' : '❌ manquante')
  console.error('- ADMIN_SECRET:', ADMIN_SECRET ? '✅' : '❌ manquante')
  process.exit(1)
}

function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const isHttps = parsedUrl.protocol === 'https:'
    const client = isHttps ? https : http
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(data))
      }
    }

    const req = client.request(options, (res) => {
      let body = ''
      
      res.on('data', (chunk) => {
        body += chunk
      })
      
      res.on('end', () => {
        try {
          const result = JSON.parse(body)
          resolve({
            statusCode: res.statusCode,
            body: result,
            headers: res.headers
          })
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            body: body,
            headers: res.headers
          })
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.write(JSON.stringify(data))
    req.end()
  })
}

async function processDeletions() {
  console.log('🗂️ [DELETION PROCESSOR] Démarrage du traitement des suppressions programmées')
  console.log(`🔗 URL de l'API: ${APP_URL}/api/account/delete`)
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`)
  
  try {
    const startTime = Date.now()
    
    const response = await makeRequest(`${APP_URL}/api/account/delete`, {
      action: 'execute_pending_deletions',
      adminSecret: ADMIN_SECRET
    })

    const processingTime = Date.now() - startTime

    console.log(`📡 Réponse reçue (${processingTime}ms):`)
    console.log(`   Status: ${response.statusCode}`)
    
    if (response.statusCode === 200) {
      const result = response.body
      console.log('✅ Traitement réussi:')
      console.log(`   - Suppressions exécutées: ${result.executed || 0}`)
      console.log(`   - Échecs: ${result.failed || 0}`)
      console.log(`   - Total traité: ${result.total || 0}`)
      
      if (result.executed > 0) {
        console.log(`🎯 ${result.executed} compte(s) supprimé(s) avec succès`)
      }
      
      if (result.failed > 0) {
        console.log(`⚠️ ${result.failed} échec(s) de suppression`)
      }
      
      if (result.executed === 0 && result.failed === 0) {
        console.log('ℹ️ Aucune suppression en attente')
      }
      
    } else {
      console.error('❌ Erreur lors du traitement:')
      console.error(`   Status: ${response.statusCode}`)
      console.error(`   Body:`, response.body)
      process.exit(1)
    }

  } catch (error) {
    console.error('💥 Erreur fatale:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

async function checkPendingDeletions() {
  console.log('\n📊 [MONITORING] Vérification des suppressions en attente...')
  
  try {
    // Cette partie nécessiterait une route de monitoring dédiée
    // Pour l'instant, on se contente du traitement principal
    console.log('ℹ️ Monitoring des suppressions en attente non implémenté')
    console.log('💡 Suggestion: Ajouter une route GET /api/account/delete/pending pour le monitoring')
    
  } catch (error) {
    console.warn('⚠️ Erreur lors de la vérification des suppressions en attente:', error.message)
  }
}

async function cleanupExpiredRequests() {
  console.log('\n🧹 [CLEANUP] Nettoyage des demandes expirées...')
  
  try {
    // Cette partie utiliserait la fonction cleanup_expired_deletion_requests()
    // via une route dédiée si nécessaire
    console.log('ℹ️ Nettoyage automatique géré par la base de données')
    
  } catch (error) {
    console.warn('⚠️ Erreur lors du nettoyage:', error.message)
  }
}

// Fonction principale
async function main() {
  console.log('=' .repeat(60))
  console.log('🚀 LETTERCRAFT - PROCESSEUR DE SUPPRESSIONS DE COMPTES')
  console.log('=' .repeat(60))
  
  try {
    await processDeletions()
    await checkPendingDeletions()
    await cleanupExpiredRequests()
    
    console.log('\n' + '=' .repeat(60))
    console.log('✅ Traitement terminé avec succès')
    console.log('=' .repeat(60))
    
  } catch (error) {
    console.error('\n' + '=' .repeat(60))
    console.error('💥 Erreur fatale dans le traitement principal')
    console.error('=' .repeat(60))
    console.error(error)
    process.exit(1)
  }
}

// Gestion des signaux système
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt demandé par l\'utilisateur (SIGINT)')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt demandé par le système (SIGTERM)')
  process.exit(0)
})

process.on('uncaughtException', (error) => {
  console.error('💥 Exception non gérée:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promise rejetée non gérée:', reason)
  console.error('Promise:', promise)
  process.exit(1)
})

// Démarrage du script
if (require.main === module) {
  main()
}

module.exports = { processDeletions, checkPendingDeletions, cleanupExpiredRequests }