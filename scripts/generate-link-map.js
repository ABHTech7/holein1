#!/usr/bin/env node

/**
 * Static Link Map Generator
 * Parses codebase to enumerate all navigation paths and generates a JSON map
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const linkMap = {
  generatedAt: new Date().toISOString(),
  links: [],
  routes: [],
  warnings: []
};

/**
 * Extract navigation patterns from file content
 */
function extractNavigationFromFile(filePath, content) {
  const results = [];
  
  // Match Link components: <Link to="...">
  const linkMatches = content.matchAll(/<Link[^>]+to=['"]([^'"]+)['"][^>]*>([^<]*(?:<[^/>]+\/>[^<]*)*)/g);
  for (const match of linkMatches) {
    results.push({
      type: 'Link',
      targetRoute: match[1],
      text: match[2].replace(/<[^>]+>/g, '').trim(),
      sourceFile: filePath,
      lineNumber: content.substring(0, match.index).split('\n').length
    });
  }
  
  // Match navigate() calls: navigate('/path')
  const navigateMatches = content.matchAll(/navigate\(['"]([^'"]+)['"]\)/g);
  for (const match of navigateMatches) {
    results.push({
      type: 'navigate',
      targetRoute: match[1],
      text: '',
      sourceFile: filePath,
      lineNumber: content.substring(0, match.index).split('\n').length
    });
  }
  
  // Match href attributes: href="/path"
  const hrefMatches = content.matchAll(/href=['"]([^'"]+)['"]/g);
  for (const match of hrefMatches) {
    if (!match[1].startsWith('http') && !match[1].startsWith('mailto') && !match[1].startsWith('tel')) {
      results.push({
        type: 'href',
        targetRoute: match[1],
        text: '',
        sourceFile: filePath,
        lineNumber: content.substring(0, match.index).split('\n').length
      });
    }
  }
  
  // Match Route definitions: <Route path="..." element={...} />
  const routeMatches = content.matchAll(/<Route[^>]+path=['"]([^'"]+)['"][^>]*>/g);
  for (const match of routeMatches) {
    linkMap.routes.push({
      path: match[1],
      sourceFile: filePath,
      lineNumber: content.substring(0, match.index).split('\n').length
    });
  }
  
  return results;
}

/**
 * Check for hardcoded routes (not using ROUTES constants)
 */
function checkForHardcodedRoutes(filePath, content) {
  const warnings = [];
  
  // Look for hardcoded dashboard routes
  const hardcodedPatterns = [
    /['"]\/dashboard\/admin[^'"]*['"]/g,
    /['"]\/dashboard\/club[^'"]*['"]/g,
    /['"]\/players\/[^'"]*['"]/g,
    /['"]\/clubs\/[^'"]*['"]/g
  ];
  
  hardcodedPatterns.forEach(pattern => {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      warnings.push({
        type: 'hardcoded_route',
        route: match[0],
        sourceFile: filePath,
        lineNumber: content.substring(0, match.index).split('\n').length,
        suggestion: 'Use ROUTES constants instead of hardcoded strings'
      });
    }
  });
  
  return warnings;
}

/**
 * Check for missing accessibility features
 */
function checkAccessibility(filePath, content) {
  const warnings = [];
  
  // Look for buttons with only icons (should have aria-label)
  const iconButtonMatches = content.matchAll(/<button[^>]*>.*?<\w+Icon.*?<\/button>/gs);
  for (const match of iconButtonMatches) {
    if (!match[0].includes('aria-label') && !match[0].includes('aria-labelledby')) {
      warnings.push({
        type: 'accessibility',
        issue: 'Icon-only button missing aria-label',
        sourceFile: filePath,
        lineNumber: content.substring(0, match.index).split('\n').length,
        suggestion: 'Add aria-label attribute for screen readers'
      });
    }
  }
  
  // Look for primary actions without test IDs
  const primaryButtonMatches = content.matchAll(/<Button[^>]*variant=['"]primary['"][^>]*>/g);
  for (const match of primaryButtonMatches) {
    if (!match[0].includes('data-testid')) {
      warnings.push({
        type: 'testing',
        issue: 'Primary button missing data-testid',
        sourceFile: filePath,
        lineNumber: content.substring(0, match.index).split('\n').length,
        suggestion: 'Add data-testid for reliable testing'
      });
    }
  }
  
  return warnings;
}

/**
 * Process all TypeScript/JavaScript files
 */
function processFiles() {
  const files = glob.sync('src/**/*.{tsx,ts,jsx,js}');
  
  files.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract navigation links
      const navigationLinks = extractNavigationFromFile(filePath, content);
      linkMap.links.push(...navigationLinks);
      
      // Check for issues
      const hardcodedWarnings = checkForHardcodedRoutes(filePath, content);
      const accessibilityWarnings = checkAccessibility(filePath, content);
      
      linkMap.warnings.push(...hardcodedWarnings, ...accessibilityWarnings);
      
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
    }
  });
}

/**
 * Generate summary statistics
 */
function generateSummary() {
  const summary = {
    totalLinks: linkMap.links.length,
    linksByType: {},
    routeCount: linkMap.routes.length,
    warningCount: linkMap.warnings.length,
    warningsByType: {}
  };
  
  // Count links by type
  linkMap.links.forEach(link => {
    summary.linksByType[link.type] = (summary.linksByType[link.type] || 0) + 1;
  });
  
  // Count warnings by type
  linkMap.warnings.forEach(warning => {
    summary.warningsByType[warning.type] = (summary.warningsByType[warning.type] || 0) + 1;
  });
  
  return summary;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Generating navigation link map...');
  
  processFiles();
  const summary = generateSummary();
  
  // Add summary to link map
  linkMap.summary = summary;
  
  // Write link map to file
  fs.writeFileSync('scripts/link-map.json', JSON.stringify(linkMap, null, 2));
  
  console.log('📊 Link map generated:');
  console.log(`   Total links found: ${summary.totalLinks}`);
  console.log(`   Routes defined: ${summary.routeCount}`);
  console.log(`   Warnings: ${summary.warningCount}`);
  
  if (summary.warningCount > 0) {
    console.log('\n⚠️  Issues found:');
    Object.entries(summary.warningsByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
  }
  
  console.log('\n✅ Link map saved to scripts/link-map.json');
}

// Install glob if not available
try {
  require('glob');
} catch (error) {
  console.log('Installing required dependency: glob');
  require('child_process').execSync('npm install glob --save-dev', { stdio: 'inherit' });
}

if (require.main === module) {
  main();
}

module.exports = { main, extractNavigationFromFile, checkForHardcodedRoutes, checkAccessibility };