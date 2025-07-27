/**
 * Script pour tester les traductions de quota dans toutes les langues
 * Usage: node scripts/test-quota-translations.js
 */

const fs = require('fs')
const path = require('path')

function loadTranslations() {
  const i18nDir = path.join(__dirname, '..', 'lib', 'i18n')
  const languages = ['fr', 'en', 'es', 'de', 'it']
  const translations = {}
  
  for (const lang of languages) {
    const filePath = path.join(i18nDir, `${lang}.json`)
    if (fs.existsSync(filePath)) {
      translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }
  }
  
  return translations
}

function testQuotaTranslations() {
  console.log('🌍 Test des traductions de quota...\n')
  
  const translations = loadTranslations()
  const languages = Object.keys(translations)
  
  // Clés utilisées dans QuotaBanner.tsx
  const requiredKeys = [
    'quota.guard.quotaExceededTitle',
    'quota.messages.quotaExceeded',
    'quota.messages.comeBackIn',
    'quota.messages.approachingLimit',
    'quota.messages.remainingGenerations',
    'quota.messages.freePlanInfo',
    'quota.actions.upgrade',
    'quota.free',
    'quota.premium',
    'quota.status.exceeded',
    'quota.remaining'
  ]
  
  console.log('🔍 Vérification des clés requises:')
  
  let allKeysPresent = true
  
  for (const key of requiredKeys) {
    console.log(`\n📝 Clé: ${key}`)
    
    for (const lang of languages) {
      const keys = key.split('.')
      let value = translations[lang]
      
      for (const k of keys) {
        value = value?.[k]
      }
      
      if (value) {
        console.log(`  ✅ ${lang.toUpperCase()}: "${value}"`)
      } else {
        console.log(`  ❌ ${lang.toUpperCase()}: MANQUANT`)
        allKeysPresent = false
      }
    }
  }
  
  console.log('\n' + '='.repeat(60))
  
  if (allKeysPresent) {
    console.log('🎉 Toutes les traductions de quota sont présentes !')
    console.log('✅ QuotaBanner.tsx supportera toutes les langues configurées.')
  } else {
    console.log('❌ Certaines traductions sont manquantes.')
    console.log('💡 Ajoutez les clés manquantes dans les fichiers de traduction.')
  }
  
  console.log('\n📊 Résumé:')
  console.log(`  Langues testées: ${languages.join(', ')}`)
  console.log(`  Clés vérifiées: ${requiredKeys.length}`)
  console.log(`  Total vérifications: ${languages.length * requiredKeys.length}`)
  
  // Test de formatage avec paramètres
  console.log('\n🧪 Test de formatage avec paramètres:')
  
  const testParams = [
    {
      key: 'quota.messages.quotaExceeded',
      params: { max: 10 },
      description: 'Message quota dépassé'
    },
    {
      key: 'quota.messages.remainingGenerations', 
      params: { count: 3, s: 's', used: 7, max: 10 },
      description: 'Générations restantes'
    },
    {
      key: 'quota.messages.freePlanInfo',
      params: { count: 5 },
      description: 'Info plan gratuit'
    }
  ]
  
  for (const test of testParams) {
    console.log(`\n📋 ${test.description}:`)
    
    for (const lang of languages) {
      const keys = test.key.split('.')
      let template = translations[lang]
      
      for (const k of keys) {
        template = template?.[k]
      }
      
      if (template) {
        // Simulation simple du remplacement de paramètres
        let result = template
        for (const [param, value] of Object.entries(test.params)) {
          result = result.replace(new RegExp(`\\{${param}\\}`, 'g'), value)
        }
        console.log(`  ${lang.toUpperCase()}: "${result}"`)
      } else {
        console.log(`  ${lang.toUpperCase()}: TEMPLATE MANQUANT`)
      }
    }
  }
}

testQuotaTranslations()