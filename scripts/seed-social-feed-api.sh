#!/bin/bash
# Seed social feed with demo posts via Supabase REST API

set -e

SUPABASE_URL="https://kqftsiohgdzlyfqbhxbc.supabase.co"
SUPABASE_SERVICE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" .env.local | cut -d'=' -f2 | tr -d '"')
TEST_USER_ID="e64f9ebc-e8d0-4ad0-a7bd-027208acb4cb"

echo "🌱 Seeding social feed with demo posts..."
echo "User ID: $TEST_USER_ID"
echo ""

# Function to create post
create_post() {
  local content=$1
  local hours_ago=$2
  local visibility=${3:-public}

  local created_at=$(date -u -v-${hours_ago}H +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "${hours_ago} hours ago" +"%Y-%m-%dT%H:%M:%S.000Z")

  curl -s -X POST "${SUPABASE_URL}/rest/v1/post" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{
      \"user_id\": \"${TEST_USER_ID}\",
      \"content\": \"${content}\",
      \"visibility\": \"${visibility}\",
      \"media_urls\": [],
      \"created_at\": \"${created_at}\"
    }" > /dev/null
}

echo "📝 Creating 10 demo posts..."

# Post 1: Welcome (48 hours ago)
create_post "¡Bienvenido a PadelGraph! 🎾 La red social definitiva para jugadores de pádel. #padel #padelgraph" 48

# Post 2: Tournament win (24 hours ago)
create_post "Just won my first tournament! 🏆 So excited to be part of this amazing community. Thanks to all my opponents for the great matches! #tournament #victory" 24

# Post 3: Looking for players (12 hours ago)
create_post "Looking for intermediate players in Miami this weekend 🌴 Who wants to play? Drop a comment! #miami #findpartner" 12

# Post 4: Personal record (8 hours ago)
create_post "New personal record: 15 match win streak! 💪 Feeling unstoppable. Time to move up to advanced level? 🤔 #winstreak #levelup" 8

# Post 5: Sunset courts (5 hours ago)
create_post "Beautiful sunset at the courts today 🌅 Love this sport! #padellife #sunset" 5

# Post 6: Training tip (3 hours ago)
create_post "Pro tip: Practice your bandeja for 30 minutes every day. Game changer! 🎯 What's your favorite shot? #training #tips" 3

# Post 7: Friend post (2 hours ago, friends only)
create_post "Private match tonight with the crew 🤝 Can't wait!" 2 "friends"

# Post 8: Recent match (1 hour ago)
create_post "Just finished an intense match! 6-4, 4-6, 7-5 in the tiebreak 😅 My heart can't take this anymore lol #closematch #adrenaline" 1

# Post 9: Equipment question (30 min ago - using 0.5 hours)
create_post "Thinking about upgrading my racket. Any recommendations for intermediate players? 🎾 #equipment #advice" 1

# Post 10: Most recent (10 min ago - using 0.2 hours)
create_post "Can't believe how much I've improved since joining PadelGraph! 📈 The analytics really help you understand your game better. Highly recommend! #progress #analytics" 1

echo "✅ 10 posts created!"
echo ""

# Verify posts were created
echo "🔍 Verifying posts..."
POST_COUNT=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/post?user_id=eq.${TEST_USER_ID}&select=id" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" | grep -o '"id"' | wc -l)

echo "📊 Total posts for test user: $POST_COUNT"
echo ""

if [ "$POST_COUNT" -ge 10 ]; then
  echo "🎉 Social feed seeded successfully!"
else
  echo "⚠️  Expected 10+ posts, found $POST_COUNT"
  echo "   Some posts may have failed to create"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Credentials:"
echo "  Email: $TEST_EMAIL"
echo "  Password: $TEST_PASSWORD"
echo "  User ID: $TEST_USER_ID"
