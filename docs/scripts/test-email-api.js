/**
 * Script pour tester l'API email LetterCraft
 * Usage: node scripts/test-email-api.js
 */

const path = require('path')
const fs = require('fs')

// Charger les variables d'environnement depuis .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local')
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    const lines = envContent.split('\n')
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '')
          process.env[key.trim()] = value.trim()
        }
      }
    }
    console.log('✅ Variables d\'environnement chargées depuis .env.local')
  } else {
    console.log('⚠️  Fichier .env.local non trouvé')
  }
}

// Polyfill fetch pour Node.js
if (!global.fetch) {
  global.fetch = require('node-fetch')
}

loadEnvFile()

async function testEmailAPI() {
  try {
    console.log('🧪 Test de l\'API email LetterCraft...')
    
    // Configuration
    const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    const TEST_EMAIL = process.env.TEST_EMAIL || 'contact@lettercraft.app'
    
    console.log('🔧 Configuration:')
    console.log('  API_URL:', API_URL)
    console.log('  TEST_EMAIL:', TEST_EMAIL)
    console.log('  BREVO_API_KEY:', process.env.BREVO_API_KEY ? 'Définie' : 'NON DÉFINIE')
    
    // Test 1: Email de bienvenue
    console.log('\n📧 Test 1: Email de bienvenue...')
    
    const welcomeEmailData = {
      type: 'welcome',
      userEmail: TEST_EMAIL,
      userName: 'Utilisateur Test',
      userLanguage: 'fr'
    }
    
    const welcomeResponse = await fetch(`${API_URL}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(welcomeEmailData)
    })
    
    if (welcomeResponse.ok) {
      const welcomeResult = await welcomeResponse.json()
      console.log('✅ Email de bienvenue envoyé:', welcomeResult.message)
    } else {
      const error = await welcomeResponse.text()
      console.error('❌ Erreur email de bienvenue:', welcomeResponse.status, error)
    }
    
    // Test 2: Email d'avertissement quota
    console.log('\n⚠️  Test 2: Email d\'avertissement quota...')
    
    const quotaWarningData = {
      type: 'quota_warning',
      userEmail: TEST_EMAIL,
      userName: 'Utilisateur Test',
      userLanguage: 'fr',
      remainingQuota: 2
    }
    
    const quotaResponse = await fetch(`${API_URL}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quotaWarningData)
    })
    
    if (quotaResponse.ok) {
      const quotaResult = await quotaResponse.json()
      console.log('✅ Email d\'avertissement quota envoyé:', quotaResult.message)
    } else {
      const error = await quotaResponse.text()
      console.error('❌ Erreur email quota:', quotaResponse.status, error)
    }
    
    // Test 3: Email de confirmation d'abonnement
    console.log('\n👑 Test 3: Email de confirmation d\'abonnement...')
    
    const subscriptionData = {
      type: 'subscription_confirmed',
      userEmail: TEST_EMAIL,
      userName: 'Utilisateur Premium',
      userLanguage: 'fr',
      invoiceUrl: 'https://example.com/invoice'
    }
    
    const subscriptionResponse = await fetch(`${API_URL}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionData)
    })
    
    if (subscriptionResponse.ok) {
      const subscriptionResult = await subscriptionResponse.json()
      console.log('✅ Email de confirmation d\'abonnement envoyé:', subscriptionResult.message)
    } else {
      const error = await subscriptionResponse.text()
      console.error('❌ Erreur email abonnement:', subscriptionResponse.status, error)
    }
    
    console.log('\n🎉 Tests terminés!')
    console.log('💡 Vérifiez votre boîte email:', TEST_EMAIL)
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.log('🚨 Le serveur Next.js n\'est peut-être pas démarré')
      console.log('💡 Lancez d\'abord: npm run dev')
    }
  }
}

// Installer node-fetch si nécessaire
async function ensureNodeFetch() {
  try {
    require('node-fetch')
  } catch (e) {
    console.log('📦 Installation de node-fetch...')
    const { execSync } = require('child_process')
    execSync('npm install node-fetch@2', { stdio: 'inherit' })
    console.log('✅ node-fetch installé')
  }
}

// Exécuter le test
async function main() {
  await ensureNodeFetch()
  await testEmailAPI()
}

main()