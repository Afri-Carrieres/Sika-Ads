import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceIcon = path.join(__dirname, '../public/Web-Icon.png');
const iconDir = path.join(__dirname, '../public/icons');
const screenshotDir = path.join(__dirname, '../public/screenshots');

// Créer les dossiers
[iconDir, screenshotDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    // console.log(`📁 Dossier créé: ${dir}`);
  }
});

// Vérifier que l'image source existe
if (!fs.existsSync(sourceIcon)) {
  console.error(`❌ Erreur: ${sourceIcon} n'existe pas!`);
  console.error('Assurez-vous que Web-Icon.png existe dans le dossier public/');
  process.exit(1);
}

console.log('🎨 Génération des icons...\n');

const tasks = [];

// Sizes d'icons à générer
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Générer les icons standards
sizes.forEach(size => {
  tasks.push(
    sharp(sourceIcon)
      .resize(size, size, { fit: 'cover', position: 'center' })
      .png()
      .toFile(path.join(iconDir, `icon-${size}x${size}.png`))
      .then(() => console.log(`✓ icon-${size}x${size}.png`))
      .catch(err => console.error(`✗ Erreur pour icon-${size}x${size}.png:`, err.message))
  );
});

// Maskable icons (avec padding pour les shapes adaptatives)
[192, 512].forEach(size => {
  const padding = Math.round(size * 0.2); // 20% de padding
  tasks.push(
    sharp(sourceIcon)
      .resize(size - padding * 2, size - padding * 2, { fit: 'contain', background: { r: 34, g: 197, b: 94, alpha: 0 } })
      .png()
      .toFile(path.join(iconDir, `icon-${size}x${size}-maskable.png`))
      .then(() => console.log(`✓ icon-${size}x${size}-maskable.png`))
      .catch(err => console.error(`✗ Erreur pour icon-${size}x${size}-maskable.png:`, err.message))
  );
});

// Apple icons
[180, 152, 167].forEach(size => {
  tasks.push(
    sharp(sourceIcon)
      .resize(size, size, { fit: 'cover', position: 'center' })
      .png()
      .toFile(path.join(iconDir, `apple-icon-${size}.png`))
      .then(() => console.log(`✓ apple-icon-${size}.png`))
      .catch(err => console.error(`✗ Erreur pour apple-icon-${size}.png:`, err.message))
  );
});

// Exécuter toutes les tâches
Promise.all(tasks)
  .then(() => {
    console.log('\n✅ Tous les icons ont été générés avec succès!');
    console.log(`📍 Icons disponibles dans: ${iconDir}`);
    
    // Lister les fichiers générés
    const files = fs.readdirSync(iconDir);
    console.log('\n📋 Fichiers générés:');
    files.sort().forEach(file => {
      const fullPath = path.join(iconDir, file);
      const stats = fs.statSync(fullPath);
      console.log(`   - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });
  })
  .catch(err => {
    console.error('\n❌ Erreur lors de la génération des icons:', err);
    process.exit(1);
  });
