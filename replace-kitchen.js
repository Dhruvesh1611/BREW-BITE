const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'frontend/src/app/kitchen/page.js');

const replacements = {
  '#1A4D2E': '#3E2B21',
  '#143D24': '#2C1810',
  'bg-emerald-50': 'bg-[#F3EDE5]',
  'border-emerald-200': 'border-[#EBE4D5]',
  'bg-green-500': 'bg-[#D4A373]',
  'from-green-50': 'from-[#F3EDE5]',
  'shadow-[#1A4D2E]': 'shadow-[#3E2B21]'
};

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  let originalContent = content;

  for (const [key, value] of Object.entries(replacements)) {
    content = content.split(key).join(value);
  }

  if (content !== originalContent) {
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log(`Updated ${targetFile}`);
  } else {
    console.log('No replacements made.');
  }
} else {
  console.log('File not found:', targetFile);
}
