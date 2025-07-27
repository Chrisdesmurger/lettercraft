/**
 * Script de test simple pour Brevo avec fetch direct
 * Usage: node scripts/test-brevo-simple.js
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

// Polyfill fetch pour Node.js plus anciens
if (!global.fetch) {
  global.fetch = require('node-fetch')
}

// Charger les variables d'environnement
loadEnvFile()

async function testBrevoWithFetch() {
  try {
    console.log('🧪 Test Brevo avec API REST directe...')
    
    // Debug des variables d'environnement
    console.log('🔍 Variables Brevo disponibles:')
    console.log('  BREVO_API_KEY:', process.env.BREVO_API_KEY ? `${process.env.BREVO_API_KEY.substring(0, 10)}...` : 'NON DÉFINIE')
    console.log('  BREVO_SENDER_EMAIL:', process.env.BREVO_SENDER_EMAIL || 'NON DÉFINIE')
    console.log('  BREVO_SENDER_NAME:', process.env.BREVO_SENDER_NAME || 'NON DÉFINIE')
    
    // Vérifier la présence de l'API key
    if (!process.env.BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY non définie')
      return
    }

    if (!process.env.BREVO_API_KEY.startsWith('xkeysib-')) {
      console.error('❌ BREVO_API_KEY semble invalide (doit commencer par "xkeysib-")')
      return
    }

    // Test 1: Récupérer les informations du compte
    console.log('\n📡 Test 1: Informations du compte...')
    
    const accountResponse = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      }
    })

    if (!accountResponse.ok) {
      const errorText = await accountResponse.text()
      console.error('❌ Erreur API compte:', accountResponse.status, errorText)
      return
    }

    const accountData = await accountResponse.json()
    console.log('✅ Connexion réussie!')
    console.log('📧 Email:', accountData.email)
    console.log('🏢 Entreprise:', accountData.companyName || 'Non défini')
    console.log('📊 Plan:', accountData.plan?.type || 'Non défini')

    // Test 2: Envoyer un email de test (si TEST_EMAIL est défini)
    if (process.env.TEST_EMAIL) {
      console.log('\n📤 Test 2: Envoi d\'email de test...')
      
      const emailData = {
        to: [{ 
          email: process.env.TEST_EMAIL, 
          name: 'Test LetterCraft' 
        }],
        sender: { 
          email: process.env.BREVO_SENDER_EMAIL || 'noreply@lettercraft.fr',
          name: process.env.BREVO_SENDER_NAME || 'LetterCraft Test'
        },
        subject: 'Test Brevo API - LetterCraft',
        htmlContent: `
          <h1>🎉 Test Brevo réussi !</h1>
          <p>Ce message confirme que l'intégration Brevo fonctionne correctement avec LetterCraft.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <hr>
          <p><small>Message envoyé via l'API REST Brevo</small></p>
        `,
        textContent: `Test Brevo réussi ! Intégration fonctionnelle. Timestamp: ${new Date().toISOString()}`,
        tags: ['test', 'integration', 'lettercraft']
      }

      const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      })

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text()
        console.error('❌ Erreur envoi email:', emailResponse.status, errorText)
        return
      }

      const emailResult = await emailResponse.json()
      console.log('✅ Email de test envoyé!')
      console.log('🆔 Message ID:', emailResult.messageId)
      console.log('📧 Envoyé à:', process.env.TEST_EMAIL)
    } else {
      console.log('\n💡 Pour tester l\'envoi d\'email, définissez TEST_EMAIL dans .env.local')
    }

    // Test 3: Vérifier les statistiques d'envoi
    console.log('\n📊 Test 3: Statistiques d\'envoi...')
    
    const statsResponse = await fetch('https://api.brevo.com/v3/smtp/statistics/events?limit=5', {
      method: 'GET',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      }
    })

    if (statsResponse.ok) {
      const statsData = await statsResponse.json()
      console.log('✅ Statistiques récupérées')
      console.log('📈 Événements récents:', statsData.events?.length || 0)
    } else {
      console.log('⚠️  Impossible de récupérer les statistiques')
    }

    console.log('\n🎉 Tous les tests Brevo ont réussi!')
    console.log('💡 L\'intégration LetterCraft est prête à fonctionner')

  } catch (error) {
    console.error('❌ Erreur lors du test Brevo:')
    console.error('📄 Message:', error.message)
    
    if (error.code === 'ENOTFOUND') {
      console.log('🌐 Vérifiez votre connexion internet')
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
  await testBrevoWithFetch()
}

main()