import { testAIImports } from './test-imports-extended';

async function main() {
  const result = await testAIImports();
  console.log('Test result:', result);
}

main().catch(error => {
  console.error('Fatal error during test:', error);
  process.exit(1);
});