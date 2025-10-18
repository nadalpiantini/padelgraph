# Crear Test User en Supabase Production - Guía Rápida

**Tiempo**: 3-5 minutos
**Método**: Supabase Dashboard (más fácil y seguro)

---

## 🎯 PASOS

### 1. Ir a Supabase Dashboard

**URL**: https://supabase.com/dashboard/project/kqftsiohgdzlyfqbhxbc

**Login**: Con tu cuenta Supabase

---

### 2. Navegar a Authentication

**Ruta**:
1. Left sidebar → **Authentication**
2. Click en **Users** tab

---

### 3. Crear Nuevo Usuario

**Click**: Botón verde **"Add user"** (esquina superior derecha)

**Selecciona**: "Create new user"

---

### 4. Completar Formulario

```
📧 Email: test@padelgraph.com

🔑 Password: TestPadel2025!Secure

✅ Auto Confirm User: YES (importante!)

📱 Phone: (dejar vacío)
```

**Click**: "Create user"

---

### 5. Copiar User ID

Después de crear, verás el usuario en la lista:
- Email: test@padelgraph.com
- Status: Confirmed ✅
- **User ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**Copiar** ese User ID - lo necesitaremos para seed del social feed

---

## 📝 CREDENTIALS PARA E2E TESTS

Guarda esto para los tests:

```
TEST_USER_EMAIL=test@padelgraph.com
TEST_USER_PASSWORD=TestPadel2025!Secure
TEST_USER_ID=<el_UUID_que_copiaste>
```

---

## ✅ Verificación

Para verificar que se creó correctamente:

**SQL Editor** en Supabase:
```sql
SELECT
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'test@padelgraph.com';
```

**Expected Result**:
- id: UUID
- email: test@padelgraph.com
- email_confirmed_at: <timestamp> (NO null)
- created_at: <timestamp>

---

## 🔄 Próximo Paso

Una vez creado, necesitamos crear el **profile** en `user_profile` table.

Claude ejecutará automáticamente:
```sql
INSERT INTO user_profile (
  id, user_id, name, username, email, level, ...
) VALUES (...);
```

---

## 🆘 Troubleshooting

### "Auto Confirm User" no disponible
- Puede ser setting del proyecto
- Alternativamente, crea sin confirm y luego:
  ```sql
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE email = 'test@padelgraph.com';
  ```

### "Email already exists"
- El usuario ya existe
- Obtén el UUID:
  ```sql
  SELECT id FROM auth.users WHERE email = 'test@padelgraph.com';
  ```

### "No permissions"
- Necesitas rol Owner o Admin del proyecto
- Verifica permisos en Supabase settings
