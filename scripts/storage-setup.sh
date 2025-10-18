#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 Supabase Storage Setup for Avatar Upload${NC}\n"

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v "^#" | grep -E "SUPABASE" | xargs)
fi

echo -e "${YELLOW}📦 Bucket Status:${NC}"
echo "✅ Bucket 'profile-images' already exists (public)"

echo -e "\n${YELLOW}🔐 RLS Policies Setup:${NC}"
echo "Las políticas RLS deben crearse en Supabase Dashboard:"
echo ""
echo "1. Ve a: https://supabase.com/dashboard/project/kqftsiohgdzlyfqbhxbc/storage/buckets/profile-images"
echo "2. Click en tab 'Policies'"
echo "3. Click en 'New Policy'"
echo "4. Crea estas 4 políticas:"
echo ""
echo -e "${GREEN}Política 1:${NC} Users can upload their own profile images"
echo "  Operation: INSERT"
echo "  Target roles: authenticated"
echo "  WITH CHECK: bucket_id = 'profile-images' AND (storage.foldername(name))[1] = 'avatars'"
echo ""
echo -e "${GREEN}Política 2:${NC} Public read access to profile images"
echo "  Operation: SELECT"
echo "  Target roles: public"
echo "  USING: bucket_id = 'profile-images'"
echo ""
echo -e "${GREEN}Política 3:${NC} Users can update their own profile images"
echo "  Operation: UPDATE"
echo "  Target roles: authenticated"
echo "  USING: bucket_id = 'profile-images'"
echo "  WITH CHECK: bucket_id = 'profile-images'"
echo ""
echo -e "${GREEN}Política 4:${NC} Users can delete their own profile images"
echo "  Operation: DELETE"
echo "  Target roles: authenticated"
echo "  USING: bucket_id = 'profile-images'"
echo ""
echo -e "${YELLOW}📝 O ejecuta el SQL directamente:${NC}"
echo "   Abre SQL Editor en Supabase Dashboard y pega el contenido de:"
echo "   📄 scripts/create-storage-policies.sql"
echo ""
echo -e "${GREEN}🧪 Test:${NC} http://localhost:3000/profile"
echo ""
echo -e "${YELLOW}⚡ Quick Setup:${NC}"
echo "   1. Abre: https://supabase.com/dashboard/project/kqftsiohgdzlyfqbhxbc/sql/new"
echo "   2. Pega el SQL de: scripts/create-storage-policies.sql"
echo "   3. Click 'RUN'"
echo "   4. ¡Listo!"
