// PayPal Connection Test Script
import { getPayPalClient, getPayPalMode, isPayPalConfigured, getPayPalAccessToken } from '../src/lib/paypal/client';
import { validatePayPalConfig } from '../src/lib/paypal/config';

async function testPayPalConnection() {
  console.log('🔍 Testing PayPal Connection...\n');

  // 1. Check configuration
  console.log('Step 1: Validating configuration...');
  const configured = isPayPalConfigured();
  const mode = getPayPalMode();

  console.log(`  ✅ PayPal Mode: ${mode}`);
  console.log(`  ${configured ? '✅' : '❌'} Configuration Status: ${configured ? 'Valid' : 'Invalid'}\n`);

  if (!configured) {
    console.error('❌ PayPal not configured. Check environment variables.');
    process.exit(1);
  }

  // 2. Validate all config
  console.log('Step 2: Validating all PayPal config...');
  validatePayPalConfig();
  console.log('  ✅ Configuration validated\n');

  // 3. Initialize client
  console.log('Step 3: Initializing PayPal client...');
  try {
    const client = getPayPalClient();
    console.log(`  ✅ Base URL: ${client.baseUrl}`);
    console.log('  ✅ PayPal client initialized successfully\n');

    // 4. Test OAuth token generation
    console.log('Step 4: Testing OAuth token generation...');
    const token = await getPayPalAccessToken();
    console.log(`  ✅ Access token obtained: ${token.substring(0, 20)}...\n`);

    console.log('✅ PayPal Connection Test: PASSED\n');
    console.log(`Mode: ${mode}`);
    console.log('Client authenticated and ready for subscription operations.');

    return true;
  } catch (error) {
    console.error('❌ PayPal client initialization failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run test
testPayPalConnection()
  .then(() => {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
