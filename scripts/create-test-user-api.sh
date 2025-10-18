#!/bin/bash
# Create test user via Supabase Auth API
# This creates the user in production database

set -e

SUPABASE_URL="https://kqftsiohgdzlyfqbhxbc.supabase.co"
# Load from .env.local
SUPABASE_SERVICE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" .env.local | cut -d'=' -f2)
TEST_EMAIL="test@padelgraph.com"
TEST_PASSWORD="TestPadel2025!Secure"

echo "🔐 Creating test user in Supabase Production..."
echo "Email: $TEST_EMAIL"
echo ""

# Create user via Supabase Auth Admin API
RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\",
    \"email_confirm\": true,
    \"user_metadata\": {
      \"name\": \"Test User\",
      \"username\": \"testuser\"
    }
  }")

echo "Response: $RESPONSE"
echo ""

# Extract user ID from response
USER_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo "❌ Failed to create user. Check response above."
  exit 1
fi

echo "✅ User created successfully!"
echo "User ID: $USER_ID"
echo ""

# Save credentials to file
cat > .test-user-credentials.txt <<EOF
TEST_USER_EMAIL=$TEST_EMAIL
TEST_USER_PASSWORD=$TEST_PASSWORD
TEST_USER_ID=$USER_ID
EOF

echo "💾 Credentials saved to: .test-user-credentials.txt"
echo ""
echo "🔄 Next: Creating user profile..."

# Create user profile
PROFILE_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/user_profile" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"id\": \"${USER_ID}\",
    \"user_id\": \"${USER_ID}\",
    \"name\": \"Test User\",
    \"username\": \"testuser\",
    \"email\": \"${TEST_EMAIL}\",
    \"bio\": \"E2E Test Account for PadelGraph testing\",
    \"level\": \"intermediate\",
    \"preferred_position\": \"right\",
    \"elo_rating\": 1200,
    \"rank_points\": 1000,
    \"ranking_points\": 1000,
    \"location_lat\": 25.7617,
    \"location_lng\": -80.1918
  }")

echo "Profile Response: $PROFILE_RESPONSE"
echo ""

if echo "$PROFILE_RESPONSE" | grep -q "\"id\""; then
  echo "✅ User profile created successfully!"
else
  echo "⚠️  Profile creation may have failed. Check response above."
  echo "   User still created in auth.users, profile can be created manually."
fi

echo ""
echo "🎉 Test user setup complete!"
echo ""
echo "📋 Credentials for E2E tests:"
echo "  Email: $TEST_EMAIL"
echo "  Password: $TEST_PASSWORD"
echo "  User ID: $USER_ID"
