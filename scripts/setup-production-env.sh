#!/bin/bash
# Production Environment Setup Script for PadelGraph
# Run this after obtaining PayPal Production credentials

set -e

echo "🚀 PadelGraph Production Environment Setup"
echo "==========================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install with: npm i -g vercel"
    exit 1
fi

echo "📝 This script will add the following environment variables to Vercel Production:"
echo ""
echo "  1. PAYPAL_MODE=production"
echo "  2. PAYPAL_CLIENT_ID"
echo "  3. PAYPAL_SECRET"
echo "  4. PAYPAL_WEBHOOK_ID"
echo "  5. PAYPAL_PRO_PLAN_ID"
echo "  6. PAYPAL_DUAL_PLAN_ID"
echo "  7. PAYPAL_PREMIUM_PLAN_ID"
echo "  8. PAYPAL_CLUB_PLAN_ID"
echo "  9. NEXT_PUBLIC_PAYPAL_PLAN_PRO"
echo " 10. NEXT_PUBLIC_PAYPAL_PLAN_DUAL"
echo " 11. NEXT_PUBLIC_PAYPAL_PLAN_PREMIUM"
echo " 12. NEXT_PUBLIC_PAYPAL_PLAN_CLUB"
echo " 13. CRON_SECRET"
echo ""

# Function to add env var
add_env_var() {
    local var_name=$1
    local var_value=$2
    local is_public=$3

    if [ -z "$var_value" ]; then
        echo "⏭️  Skipping $var_name (empty value)"
        return
    fi

    echo "➕ Adding $var_name..."

    # Remove existing if present
    vercel env rm "$var_name" production --yes 2>/dev/null || true

    # Add new value
    echo "$var_value" | vercel env add "$var_name" production

    echo "✅ $var_name added"
}

# Generate secure CRON_SECRET if not provided
CRON_SECRET="${CRON_SECRET:-$(openssl rand -base64 32)}"

echo ""
echo "🔐 PAYPAL CREDENTIALS"
echo "====================="
read -p "PAYPAL_CLIENT_ID: " PAYPAL_CLIENT_ID
read -p "PAYPAL_SECRET: " PAYPAL_SECRET
read -p "PAYPAL_WEBHOOK_ID: " PAYPAL_WEBHOOK_ID

echo ""
echo "📦 PLAN IDs"
echo "==========="
read -p "PAYPAL_PRO_PLAN_ID: " PAYPAL_PRO_PLAN_ID
read -p "PAYPAL_DUAL_PLAN_ID: " PAYPAL_DUAL_PLAN_ID
read -p "PAYPAL_PREMIUM_PLAN_ID: " PAYPAL_PREMIUM_PLAN_ID
read -p "PAYPAL_CLUB_PLAN_ID: " PAYPAL_CLUB_PLAN_ID

echo ""
echo "🔄 Adding environment variables to Vercel Production..."
echo ""

# Add PayPal configuration
add_env_var "PAYPAL_MODE" "production"
add_env_var "PAYPAL_CLIENT_ID" "$PAYPAL_CLIENT_ID"
add_env_var "PAYPAL_SECRET" "$PAYPAL_SECRET"
add_env_var "PAYPAL_WEBHOOK_ID" "$PAYPAL_WEBHOOK_ID"

# Add server-side plan IDs
add_env_var "PAYPAL_PRO_PLAN_ID" "$PAYPAL_PRO_PLAN_ID"
add_env_var "PAYPAL_DUAL_PLAN_ID" "$PAYPAL_DUAL_PLAN_ID"
add_env_var "PAYPAL_PREMIUM_PLAN_ID" "$PAYPAL_PREMIUM_PLAN_ID"
add_env_var "PAYPAL_CLUB_PLAN_ID" "$PAYPAL_CLUB_PLAN_ID"

# Add client-side plan IDs (public)
add_env_var "NEXT_PUBLIC_PAYPAL_PLAN_PRO" "$PAYPAL_PRO_PLAN_ID"
add_env_var "NEXT_PUBLIC_PAYPAL_PLAN_DUAL" "$PAYPAL_DUAL_PLAN_ID"
add_env_var "NEXT_PUBLIC_PAYPAL_PLAN_PREMIUM" "$PAYPAL_PREMIUM_PLAN_ID"
add_env_var "NEXT_PUBLIC_PAYPAL_PLAN_CLUB" "$PAYPAL_CLUB_PLAN_ID"

# Add CRON_SECRET
echo ""
echo "🔐 Generated CRON_SECRET: $CRON_SECRET"
add_env_var "CRON_SECRET" "$CRON_SECRET"

echo ""
echo "✅ All environment variables added successfully!"
echo ""
echo "📋 Summary:"
echo "  - 12 PayPal variables configured"
echo "  - 1 CRON_SECRET configured"
echo "  - Environment: Production"
echo ""
echo "🚀 Next Steps:"
echo "  1. Run: vercel --prod"
echo "  2. Test: https://padelgraph.com/pricing"
echo "  3. Verify: PayPal buttons render correctly"
echo ""
