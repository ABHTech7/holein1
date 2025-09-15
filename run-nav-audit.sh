#!/bin/bash

echo "🔧 Running Navigation Audit..."

# Run the link scanner
echo "📊 Scanning for navigation patterns..."
node scripts/link-map-runner.js

echo ""
echo "🔍 TypeScript build check..."
npx tsc --noEmit

echo ""
echo "🧪 Running Playwright navigation tests..."
npx playwright test tests/e2e/navigation.spec.ts --reporter=line

echo ""
echo "✅ Navigation audit complete!"