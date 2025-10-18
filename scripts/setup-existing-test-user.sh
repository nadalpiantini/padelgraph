#!/bin/bash
# Setup existing test user with known password and profile
# User ID: e64f9ebc-e8d0-4ad0-a7bd-027208acb4cb

set -e

SUPABASE_URL="https://kqftsiohgdzlyfqbhxbc.supabase.co"
SUPABASE_SERVICE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" .env.local | cut -d'=' -f2 | tr -d '"')
TEST_EMAIL="test@padelgraph.com"
TEST_PASSWORD="TestPadel2025!Secure"
TEST_USER_ID="e64f9ebc-e8d0-4ad0-a7bd-027208acb4cb"

echo "🔧 Setting up existing test user..."
echo "User ID: $TEST_USER_ID"
echo "Email: $TEST_EMAIL"
echo ""

# Step 1: Update password to known value
echo "🔑 Resetting password to known value..."
RESET_RESPONSE=$(curl -s -X PUT "${SUPABASE_URL}/auth/v1/admin/users/${TEST_USER_ID}" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"password\": \"${TEST_PASSWORD}\",
    \"email_confirm\": true
  }")

if echo "$RESET_RESPONSE" | grep -q '"id"'; then
  echo "✅ Password reset successfully!"
else
  echo "⚠️  Password reset response: $RESET_RESPONSE"
fi
echo ""

# Step 2: Check if profile exists
echo "🔍 Checking if user profile exists..."
PROFILE_CHECK=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/user_profile?id=eq.${TEST_USER_ID}" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

if echo "$PROFILE_CHECK" | grep -q '\[\]'; then
  echo "📝 Profile doesn't exist. Creating..."

  # Create profile
  PROFILE_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/user_profile" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "{
      \"id\": \"${TEST_USER_ID}\",
      \"user_id\": \"${TEST_USER_ID}\",
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

  if echo "$PROFILE_RESPONSE" | grep -q '"id"'; then
    echo "✅ Profile created successfully!"
  else
    echo "⚠️  Profile creation response: $PROFILE_RESPONSE"
  fi
else
  echo "✅ Profile already exists!"
  echo "$PROFILE_CHECK" | head -3
fi

echo ""
echo "🎉 Test user setup complete!"
echo ""
echo "📋 Credentials for E2E tests:"
echo "  Email: $TEST_EMAIL"
echo "  Password: $TEST_PASSWORD"
echo "  User ID: $TEST_USER_ID"
echo ""

# Save credentials
cat > .test-user-credentials.txt <<EOF
TEST_USER_EMAIL=$TEST_EMAIL
TEST_USER_PASSWORD=$TEST_PASSWORD
TEST_USER_ID=$TEST_USER_ID
EOF

echo "💾 Credentials saved to: .test-user-credentials.txt"
