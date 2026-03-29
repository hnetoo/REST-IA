import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Criar ícones baseados no design do usuário
const generateIcon = (size, filename) => {
  const svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.47}" fill="#1E40AF" stroke="#ffffff" stroke-width="${size*0.016}"/>
  
  <!-- Inner circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.39}" fill="#2563EB"/>
  
  <!-- Plate/Restaurant icon -->
  <rect x="${size*0.305}" y="${size*0.305}" width="${size*0.39}" height="${size*0.39}" rx="${size*0.04}" fill="#ffffff"/>
  
  <!-- Fork and knife -->
  <rect x="${size*0.383}" y="${size*0.383}" width="${size*0.016}" height="${size*0.234}" rx="${size*0.008}" fill="#1E40AF"/>
  <rect x="${size*0.602}" y="${size*0.383}" width="${size*0.016}" height="${size*0.234}" rx="${size*0.008}" fill="#1E40AF"/>
  
  <!-- TASCAS text -->
  <text x="${size/2}" y="${size*0.742}" font-family="Arial, sans-serif" font-size="${size*0.0625}" font-weight="bold" text-anchor="middle" fill="#ffffff">TASCAS</text>
  
  <!-- DO VEREDA text -->
  <text x="${size/2}" y="${size*0.801}" font-family="Arial, sans-serif" font-size="${size*0.03125}" text-anchor="middle" fill="#ffffff">DO VEREDA</text>
  
  <!-- Small decoration dots -->
  <circle cx="${size*0.352}" cy="${size*0.352}" r="${size*0.008}" fill="#F59E0B"/>
  <circle cx="${size*0.648}" cy="${size*0.352}" r="${size*0.008}" fill="#F59E0B"/>
  <circle cx="${size*0.352}" cy="${size*0.648}" r="${size*0.008}" fill="#F59E0B"/>
  <circle cx="${size*0.648}" cy="${size*0.648}" r="${size*0.008}" fill="#F59E0B"/>
</svg>`;

  fs.writeFileSync(path.join(__dirname, 'src-tauri/icons', filename), svgContent);
  console.log(`Generated ${filename} (${size}x${size})`);
};

// Gerar ícones em diferentes tamanhos
const sizes = [
  { size: 32, filename: '32x32.png' },
  { size: 128, filename: '128x128.png' },
  { size: 256, filename: '256x256.png' },
  { size: 512, filename: '512x512.png' },
  { size: 1024, filename: '1024x1024.png' }
];

console.log('🎨 Generating Tasca do Vereda icons...');

// Criar diretório se não existir
const iconsDir = path.join(__dirname, 'src-tauri/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Gerar todos os ícones
sizes.forEach(({ size, filename }) => {
  generateIcon(size, filename);
});

// Gerar também versão @2x para 128x128
generateIcon(256, '128x128@2x.png');

console.log('✅ Icons generated successfully!');
console.log('📁 Icons saved to: src-tauri/icons/');
console.log('');
console.log('🔄 Don\'t forget to update tauri.conf.json with new icon paths if needed');
console.log('🔄 Run npm run build:windows-fixed to rebuild with new icons');
