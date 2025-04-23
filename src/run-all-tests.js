// Simple CommonJS test runner
const { execSync } = require('child_process');

console.log('Running OpenAI import tests...\n');

try {
  // Execute each test with proper ESM flags
  const command = 'npx ts-node --esm --skipProject';
  
  console.log('1. Testing basic Langchain OpenAI imports:');
  execSync(`${command} src/test-imports.ts`, { stdio: 'inherit' });
  
  console.log('\n2. Testing direct OpenAI SDK imports:');
  execSync(`${command} src/test-imports-extended.ts`, { stdio: 'inherit' });
  
  console.log('\n3. Testing Vercel AI SDK imports:');
  execSync(`${command} src/test-ai-sdk-imports.ts`, { stdio: 'inherit' });
  
  console.log('\nAll tests completed successfully! 🎉');
} catch (error) {
  console.error('\nTest execution failed:', error.message);
  process.exit(1);
}