#!/bin/bash
set -e

# Load env vars
source .env.local

echo "🔧 Aplicando políticas de storage a Supabase..."

# Read the SQL file
SQL_CONTENT=$(cat scripts/create-storage-policies.sql)

# Execute via Supabase SQL API using curl
curl -X POST \
  "https://kqftsiohgdzlyfqbhxbc.supabase.co/rest/v1/rpc/query" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .)}" \
  2>&1 || {
    echo ""
    echo "⚠️  API method no disponible. Usando método alternativo..."
    echo ""
    echo "📋 COPIA Y PEGA EN SQL EDITOR:"
    echo "https://supabase.com/dashboard/project/kqftsiohgdzlyfqbhxbc/sql/new"
    echo ""
    cat scripts/create-storage-policies.sql
}

echo ""
echo "✅ Listo! Verifica en: http://localhost:3000/profile"
