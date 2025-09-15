#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Simple file scanning for navigation patterns
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = {
      hardcodedRoutes: [],
      links: [],
      warnings: []
    };
    
    // Find hardcoded dashboard routes
    const hardcodedPatterns = [
      /navigate\(['"]\/dashboard\/[^'"]*['"]\)/g,
      /to=['"]\/dashboard\/[^'"]*['"]/g,
      /navigate\(['"]\/players\/[^'"]*['"]\)/g,
      /navigate\(['"]\/clubs\/[^'"]*['"]\)/g
    ];
    
    hardcodedPatterns.forEach(pattern => {
      const matches = [...content.matchAll(pattern)];
      matches.forEach(match => {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        results.hardcodedRoutes.push({
          route: match[0],
          file: filePath,
          line: lineNumber
        });
      });
    });
    
    // Find all navigation patterns
    const navPatterns = [
      /navigate\(['"]([^'"]+)['"]\)/g,
      /<Link[^>]+to=['"]([^'"]+)['"][^>]*>/g,
      /href=['"]([^'"]+)['"]/g
    ];
    
    navPatterns.forEach(pattern => {
      const matches = [...content.matchAll(pattern)];
      matches.forEach(match => {
        if (!match[1].startsWith('http') && !match[1].startsWith('mailto') && !match[1].startsWith('tel')) {
          results.links.push({
            route: match[1],
            file: filePath,
            line: content.substring(0, match.index).split('\n').length
          });
        }
      });
    });
    
    return results;
  } catch (error) {
    return { hardcodedRoutes: [], links: [], warnings: [] };
  }
}

function scanDirectory(dir) {
  const results = {
    totalFiles: 0,
    hardcodedRoutes: [],
    totalLinks: 0,
    warnings: []
  };
  
  function scanRecursive(currentDir) {
    const files = fs.readdirSync(currentDir);
    
    files.forEach(file => {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        scanRecursive(fullPath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.totalFiles++;
        const fileResults = scanFile(fullPath);
        results.hardcodedRoutes.push(...fileResults.hardcodedRoutes);
        results.totalLinks += fileResults.links.length;
      }
    });
  }
  
  scanRecursive(dir);
  return results;
}

// Main execution
console.log('🔍 Scanning for navigation patterns...');
const results = scanDirectory('src');

console.log(`\n📊 Navigation Audit Summary:`);
console.log(`   Files scanned: ${results.totalFiles}`);
console.log(`   Total navigation links: ${results.totalLinks}`);
console.log(`   Hardcoded routes found: ${results.hardcodedRoutes.length}`);

if (results.hardcodedRoutes.length > 0) {
  console.log('\n⚠️  Hardcoded routes that need fixing:');
  results.hardcodedRoutes.forEach(route => {
    console.log(`   ${route.file}:${route.line} - ${route.route}`);
  });
} else {
  console.log('\n✅ No hardcoded routes found!');
}

// Write results to file
fs.writeFileSync('scripts/link-map.json', JSON.stringify(results, null, 2));
console.log('\n📄 Results saved to scripts/link-map.json');