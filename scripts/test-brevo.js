/**
 * Script de test pour vérifier l'intégration Brevo
 * Usage: node scripts/test-brevo.js
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

// Charger les variables d'environnement
loadEnvFile()

const brevo = require('@getbrevo/brevo')

async function testBrevoConnection() {
  try {
    console.log('🧪 Test de connexion Brevo...')
    
    // Debug des variables d'environnement
    console.log('🔍 Variables Brevo disponibles:')
    console.log('  BREVO_API_KEY:', process.env.BREVO_API_KEY ? `${process.env.BREVO_API_KEY.substring(0, 10)}...` : 'NON DÉFINIE')
    console.log('  BREVO_SENDER_EMAIL:', process.env.BREVO_SENDER_EMAIL || 'NON DÉFINIE')
    console.log('  BREVO_SENDER_NAME:', process.env.BREVO_SENDER_NAME || 'NON DÉFINIE')
    
    // Vérifier la présence de l'API key
    if (!process.env.BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY non définie dans les variables d\'environnement')
      console.log('💡 Ajoutez BREVO_API_KEY=xkeysib-votre-clé dans votre .env.local')
      console.log('💡 Assurez-vous que le fichier .env.local est à la racine du projet')
      return
    }

    if (!process.env.BREVO_API_KEY.startsWith('xkeysib-')) {
      console.error('❌ BREVO_API_KEY semble invalide (doit commencer par "xkeysib-")')
      return
    }

    // Configuration du client (même approche que notre service)
    const defaultClient = brevo.ApiClient.instance
    const apiKey = defaultClient.authentications['api-key']
    apiKey.apiKey = process.env.BREVO_API_KEY

    // Test de l'API Account
    const accountApi = new brevo.AccountApi()
    
    console.log('📡 Tentative de connexion à l\'API Brevo...')
    const account = await accountApi.getAccount()
    
    console.log('✅ Connexion Brevo réussie!')
    console.log('📧 Email compte:', account.email)
    console.log('🏢 Nom entreprise:', account.companyName || 'Non défini')
    console.log('📊 Plan:', account.plan?.type || 'Non défini')

    // Test d'envoi d'email de test (optionnel)
    if (process.env.TEST_EMAIL) {
      console.log('\n📤 Test d\'envoi d\'email...')
      
      const emailApi = new brevo.TransactionalEmailsApi()
      const sendSmtpEmail = {
        to: [{ email: process.env.TEST_EMAIL, name: 'Test LetterCraft' }],
        sender: { 
          email: process.env.BREVO_SENDER_EMAIL || 'noreply@lettercraft.app',
          name: process.env.BREVO_SENDER_NAME || 'LetterCraft'
        },
        subject: 'Test Brevo - LetterCraft',
        htmlContent: `
          <h1>Test Brevo réussi ! 🎉</h1>
          <p>Ce message confirme que l'intégration Brevo fonctionne correctement avec LetterCraft.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        `,
        textContent: `Test Brevo réussi ! Ce message confirme que l'intégration fonctionne. Timestamp: ${new Date().toISOString()}`,
        tags: ['test', 'integration']
      }

      const result = await emailApi.sendTransacEmail(sendSmtpEmail)
      console.log('✅ Email de test envoyé!')
      console.log('🆔 Message ID:', result.messageId)
    }

  } catch (error) {
    console.error('❌ Erreur lors du test Brevo:')
    console.error('📄 Message:', error.message)
    
    if (error.response?.body) {
      console.error('📋 Détails:', error.response.body)
    }
    
    if (error.message.includes('Invalid api key')) {
      console.log('💡 Vérifiez que votre BREVO_API_KEY est correcte')
      console.log('💡 Elle doit commencer par "xkeysib-"')
    }
  }
}

// Exécuter le test
testBrevoConnection()
