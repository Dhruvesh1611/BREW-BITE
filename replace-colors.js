const fs = require('fs');
const path = require('path');

const directories = [
  path.join(__dirname, 'frontend/src/app/pos'),
  path.join(__dirname, 'frontend/src/components/pos')
];

const replacements = {
  '#1A4D2E': '#3E2B21', // Dark Green -> Dark Brown
  '#143d24': '#2C1810', // Hover Dark Green -> Hover Dark Brown
  '#E8F5E9': '#EBE4D5', // Light Green -> Light Beige
  'bg-[#4ADE80]': 'bg-[#D4A373]', // Bright Green -> Gold
  'bg-green-400': 'bg-[#D4A373]',
  'text-green-300': 'text-[#D4A373]',
  'text-green-600': 'text-[#B08054]',
  'text-green-700': 'text-[#B08054]',
  'text-green-800': 'text-[#B08054]',
  'bg-green-50': 'bg-orange-50',
  'bg-green-100': 'bg-orange-100',
  'bg-green-800': 'bg-coffee-800',
  '#5F6F65': '#8C8775', // Muted green-grey -> Muted brown
  '#FBFBF2': '#FDFCF7', // Pale greenish cream -> Warm cream
};

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;

      for (const [key, value] of Object.entries(replacements)) {
        // Simple string replace all
        content = content.split(key).join(value);
      }

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

directories.forEach(dir => processDirectory(dir));
console.log('Finished color replacement');
