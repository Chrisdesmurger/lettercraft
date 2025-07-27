#!/usr/bin/env node

/**
 * Script de test de sécurité pour l'API Brevo
 * Teste les différents niveaux de protection
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function testRequest(description, requestConfig) {
  console.log(`\n🧪 Test: ${description}`)
  
  try {
    const response = await fetch(`${BASE_URL}/api/sync-contact`, requestConfig)
    const result = await response.json()
    
    console.log(`   Status: ${response.status}`)
    console.log(`   Réponse: ${result.message || result.error || 'OK'}`)
    
    if (response.headers.get('X-RateLimit-Remaining')) {
      console.log(`   Rate Limit: ${response.headers.get('X-RateLimit-Remaining')} restantes`)
    }
    
    return { status: response.status, data: result }
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`)
    return { status: 0, error: error.message }
  }
}

async function runSecurityTests() {
  console.log('🔐 Tests de sécurité API Brevo\n')
  console.log(`🌐 URL testée: ${BASE_URL}`)
  
  // Test 1: Requête sans authentification
  await testRequest('Requête sans authentification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'sync',
      userId: 'test-user-id'
    })
  })
  
  // Test 2: Token d'authentification invalide
  await testRequest('Token invalide', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer invalid-token'
    },
    body: JSON.stringify({
      action: 'sync',
      userId: 'test-user-id'
    })
  })
  
  // Test 3: Données invalides
  await testRequest('Validation des données (email invalide)', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer fake-token'
    },
    body: JSON.stringify({
      action: 'create',
      email: 'email-invalide',
      firstName: 'Test',
      lastName: 'User'
    })
  })
  
  // Test 4: Action admin sans permissions
  await testRequest('Action admin sans permissions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer fake-token'
    },
    body: JSON.stringify({
      action: 'create-missing'
    })
  })
  
  // Test 5: Appel interne avec secret correct
  await testRequest('Appel interne sécurisé', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': process.env.INTERNAL_API_SECRET || 'lettercraft-internal-secret-2025',
      'X-Internal-Source': 'security-test'
    },
    body: JSON.stringify({
      action: 'create',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User'
    })
  })
  
  // Test 6: Appel interne avec secret incorrect
  await testRequest('Appel interne avec mauvais secret', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': 'wrong-secret',
      'X-Internal-Source': 'security-test'
    },
    body: JSON.stringify({
      action: 'create',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User'
    })
  })
  
  // Test 7: Rate limiting
  console.log(`\n🧪 Test: Rate limiting (10 requêtes rapides)`)
  for (let i = 1; i <= 10; i++) {
    const result = await testRequest(`  Requête ${i}/10`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync',
        userId: 'test-user'
      })
    })
    
    if (result.status === 429) {
      console.log(`   ✅ Rate limiting activé à la requête ${i}`)
      break
    }
    
    // Petite pause entre les requêtes
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  // Test 8: Validation stricte des types
  await testRequest('Types de données incorrects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': process.env.INTERNAL_API_SECRET || 'lettercraft-internal-secret-2025'
    },
    body: JSON.stringify({
      action: 'bulk',
      userIds: 'not-an-array' // Devrait être un array
    })
  })
  
  // Test 9: JSON malformé
  await testRequest('JSON malformé', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"action": "sync", "userId":'  // JSON invalide
  })
  
  // Test 10: GET sans authentification
  await testRequest('GET sans authentification', {
    method: 'GET'
  })
  
  console.log('\n✅ Tests de sécurité terminés')
  console.log('\n📋 Résumé attendu:')
  console.log('   - Requêtes sans auth: Status 401 (Unauthorized)')
  console.log('   - Tokens invalides: Status 401 (Unauthorized)')
  console.log('   - Données invalides: Status 400 (Bad Request)')
  console.log('   - Actions admin sans perms: Status 403 (Forbidden)')
  console.log('   - Appels internes valides: Status 200 (Success)')
  console.log('   - Mauvais secrets: Status 401/403')
  console.log('   - Rate limiting: Status 429 après plusieurs requêtes')
  console.log('   - JSON malformé: Status 400')
}

// Fonction d'aide pour générer un token de test
function generateTestInstructions() {
  console.log('\n📝 Pour tester avec un vrai token:')
  console.log('1. Connectez-vous à votre application')
  console.log('2. Ouvrez les outils de développement')
  console.log('3. Allez dans Application > Local Storage')
  console.log('4. Copiez la valeur de supabase.auth.token')
  console.log('5. Modifiez ce script pour utiliser le vrai token')
  console.log('\nExemple:')
  console.log('const REAL_TOKEN = "eyJhbGciOiJIUzI1NiI..."')
  console.log('headers: { "Authorization": `Bearer ${REAL_TOKEN}` }')
}

// Exécuter les tests
if (require.main === module) {
  runSecurityTests()
    .then(() => {
      generateTestInstructions()
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Erreur lors des tests:', error.message)
      process.exit(1)
    })
}

module.exports = { runSecurityTests, testRequest }