import { activeApiKey, config } from './config.js';
import { revisePR } from './revise-core.js';

// Manually revise one PR from its review feedback.
// Usage: npm run revise -- <PR-number>   (watch mode does this automatically)

async function main() {
  const pr = process.argv[2];
  if (!pr) {
    console.error('Usage: npm run revise -- <PR-number>');
    process.exit(1);
  }
  if (!activeApiKey) {
    console.error(`Missing API key for provider "${config.provider}".`);
    process.exit(1);
  }

  const result = await revisePR(pr);
  if (result === 'nofeedback') {
    console.error('No review feedback found on this PR. Nothing to revise.');
    process.exit(1);
  }
  if (result === 'failed') {
    console.error(`Could not satisfy tests+build after ${config.maxAttempts} attempts.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('revise failed:', err);
  process.exit(1);
});
