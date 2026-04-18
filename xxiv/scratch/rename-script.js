const fs = require('fs');
const path = require('path');

const targetDirs = [
  'app',
  'components',
  'lib',
  'stores',
  'hooks',
  'types',
  'scripts',
  'supabase'
]; // Only scan these source folders safely

// Root directory logic
const rootDir = __dirname.replace(/\\scratch$/, '').replace(/\/scratch$/, '');

function getFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, filesList);
    } else {
      // Only process likely text/source files
      if (/\.(tsx|ts|js|jsx|css|json|md|sql)$/.test(file)) {
        filesList.push(fullPath);
      }
    }
  }
  return filesList;
}

let modifiedFiles = 0;

for (const folder of targetDirs) {
  const targetPath = path.join(rootDir, folder);
  if (!fs.existsSync(targetPath)) continue;

  const files = getFiles(targetPath);
  for (const file of files) {
    const originalContent = fs.readFileSync(file, 'utf8');
    
    // The exact regex replacements
    let newContent = originalContent
      .replace(/ycode/g, 'xxiv')
      .replace(/Ycode/g, 'Xxiv')
      .replace(/YCode/g, 'XXIV')
      .replace(/YCODE/g, 'XXIV');

    // Special edge case where it might be "y-filled.svg" etc if they meant Y as well, but we'll stick to explicitly matching "ycode" substrings.

    if (newContent !== originalContent) {
      fs.writeFileSync(file, newContent, 'utf8');
      modifiedFiles++;
      console.log(`Updated: ${path.relative(rootDir, file)}`);
    }
  }
}

// Special check for middleware.ts which is at root
const middlewarePath = path.join(rootDir, 'middleware.ts');
if (fs.existsSync(middlewarePath)) {
  const content = fs.readFileSync(middlewarePath, 'utf8');
  const nextContent = content
    .replace(/ycode/g, 'xxiv')
    .replace(/Ycode/g, 'Xxiv')
    .replace(/YCode/g, 'XXIV')
    .replace(/YCODE/g, 'XXIV');
    
  if (content !== nextContent) {
    fs.writeFileSync(middlewarePath, nextContent, 'utf8');
    modifiedFiles++;
    console.log(`Updated: middleware.ts`);
  }
}

console.log(`\n🎉 Successfully completed. Modified ${modifiedFiles} files.`);
