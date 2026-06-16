const fs = require('fs');
const path = require('path');

const directories = [
  path.join(__dirname, 'frontend/src/app/pos'),
  path.join(__dirname, 'frontend/src/components/pos')
];

const replacements = {
  '#143D24': '#2C1810',
  '#143d24': '#2C1810',
  '#4ADE80': '#C4A882',
  '#4ade80': '#C4A882',
  'bg-green-': 'bg-orange-',
  'text-green-': 'text-orange-',
  'border-green-': 'border-orange-',
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
console.log('Finished additional color replacement');
