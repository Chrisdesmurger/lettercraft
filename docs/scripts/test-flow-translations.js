/**
 * Script pour tester les traductions du module 'flow' dans toutes les langues
 * Usage: node scripts/test-flow-translations.js
 */

const fs = require("fs");
const path = require("path");

function loadTranslations() {
  const i18nDir = path.join(__dirname, "..", "lib", "i18n");
  const languages = ["fr", "en", "es", "de", "it"];
  const translations = {};

  for (const lang of languages) {
    const filePath = path.join(i18nDir, `${lang}.json`);
    if (fs.existsSync(filePath)) {
      translations[lang] = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
  }

  return translations;
}

function testFlowTranslations() {
  console.log('🌍 Test des traductions du module "flow"...\n');

  const translations = loadTranslations();
  const languages = Object.keys(translations);

  // Toutes les clés du module flow
  const allFlowKeys = new Set();

  // Collecter toutes les clés flow de toutes les langues
  for (const lang of languages) {
    if (translations[lang].flow) {
      Object.keys(translations[lang].flow).forEach((key) =>
        allFlowKeys.add(key),
      );
    }
  }

  const flowKeysArray = Array.from(allFlowKeys).sort();

  console.log('🔍 Vérification de toutes les clés du module "flow":');
  console.log(`📋 Total des clés trouvées: ${flowKeysArray.length}`);

  let allKeysPresent = true;
  const missingKeys = {};

  for (const key of flowKeysArray) {
    console.log(`\n📝 Clé: flow.${key}`);

    for (const lang of languages) {
      const value = translations[lang]?.flow?.[key];

      if (value) {
        console.log(`  ✅ ${lang.toUpperCase()}: "${value}"`);
      } else {
        console.log(`  ❌ ${lang.toUpperCase()}: MANQUANT`);
        allKeysPresent = false;

        if (!missingKeys[lang]) missingKeys[lang] = [];
        missingKeys[lang].push(`flow.${key}`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));

  if (allKeysPresent) {
    console.log('🎉 Toutes les traductions du module "flow" sont présentes !');
    console.log('✅ Le module "flow" supporte toutes les langues configurées.');
  } else {
    console.log("❌ Certaines traductions sont manquantes.");
    console.log("\n🚫 Clés manquantes par langue:");

    for (const [lang, keys] of Object.entries(missingKeys)) {
      console.log(`  ${lang.toUpperCase()}: ${keys.join(", ")}`);
    }

    console.log(
      "\n💡 Ajoutez les clés manquantes dans les fichiers de traduction.",
    );
  }

  console.log("\n📊 Résumé:");
  console.log(`  Langues testées: ${languages.join(", ")}`);
  console.log(`  Clés vérifiées: ${flowKeysArray.length}`);
  console.log(
    `  Total vérifications: ${languages.length * flowKeysArray.length}`,
  );

  // Test des nouvelles clés ajoutées
  console.log("\n🆕 Test des nouvelles clés ajoutées:");

  const newKeys = ["generating", "generatingDesc"];

  for (const key of newKeys) {
    console.log(`\n🔥 Nouvelle clé: flow.${key}`);

    for (const lang of languages) {
      const value = translations[lang]?.flow?.[key];

      if (value) {
        console.log(`  ✅ ${lang.toUpperCase()}: "${value}"`);
      } else {
        console.log(`  ❌ ${lang.toUpperCase()}: MANQUANT`);
      }
    }
  }
}

testFlowTranslations();
