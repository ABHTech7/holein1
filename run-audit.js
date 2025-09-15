const { execSync } = require('child_process');

console.log('🔧 Running Navigation Audit...\n');

try {
  // Run the link scanner
  console.log('📊 Scanning for navigation patterns...');
  execSync('node scripts/link-map-runner.js', { stdio: 'inherit' });
  
  console.log('\n🔍 TypeScript build check...');
  try {
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    console.log('✅ TypeScript build passed!');
  } catch (error) {
    console.log('❌ TypeScript build failed');
  }
  
  console.log('\n🧪 Running Playwright navigation tests...');
  try {
    execSync('npx playwright test tests/e2e/navigation.spec.ts --reporter=line', { stdio: 'inherit' });
    console.log('✅ Playwright tests passed!');
  } catch (error) {
    console.log('❌ Some Playwright tests failed');
  }
  
} catch (error) {
  console.error('Error running audit:', error.message);
}

console.log('\n✅ Navigation audit complete!');