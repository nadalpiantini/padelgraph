# Avatar Upload - Setup Guide

## ✅ Cambios Implementados

### 1. **Componente AvatarUpload** (`src/components/profile/AvatarUpload.tsx`)
- Upload de imagen con preview
- Validación de tipo y tamaño (max 2MB)
- Indicador de carga (spinner)
- Responsive para móvil y desktop
- Hover overlay en desktop para cambiar foto
- Botón flotante en móvil

### 2. **Profile Page Mobile-Responsive** (`src/app/[locale]/profile/page.tsx`)
- Layout responsive con breakpoints (sm, md, lg)
- Avatar centrado en móvil, alineado left en desktop
- Stats grid 2 columnas en móvil, 4 en desktop
- Texto adaptable según tamaño de pantalla
- Padding y spacing optimizados para móvil

## 🔧 Configuración Requerida en Supabase

### Paso 1: Crear el Storage Bucket

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **Storage** en el menú lateral
3. Click en **"New bucket"**
4. Configuración del bucket:
   - **Name**: `profile-images`
   - **Public bucket**: ✅ **SÍ** (activar)
   - **Allowed MIME types**: image/* (opcional)
   - **File size limit**: 2 MB (opcional)
5. Click en **"Create bucket"**

### Paso 2: Configurar Políticas de Seguridad (RLS)

Ve a la pestaña **Policies** del bucket `profile-images` y crea las siguientes políticas:

#### Política 1: Insertar (Upload)
```sql
CREATE POLICY "Users can upload their own profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = 'avatars'
);
```

#### Política 2: Select (Read - Público)
```sql
CREATE POLICY "Public read access to profile images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');
```

#### Política 3: Update
```sql
CREATE POLICY "Users can update their own profile images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-images')
WITH CHECK (bucket_id = 'profile-images');
```

#### Política 4: Delete
```sql
CREATE POLICY "Users can delete their own profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-images');
```

### Paso 3: Verificar Configuración

1. El bucket debe ser **público** para que las imágenes se puedan ver sin autenticación
2. Las políticas permiten que:
   - ✅ Usuarios autenticados suban imágenes
   - ✅ Cualquiera pueda ver las imágenes (público)
   - ✅ Usuarios puedan actualizar/eliminar sus imágenes

## 📱 Características Mobile-Friendly

### Responsive Breakpoints
- **Mobile**: < 640px (sm)
  - Avatar: 128px (w-32 h-32)
  - Stats: Grid 2 columnas
  - Texto centrado
  - Botón upload flotante

- **Tablet**: 640px - 768px (sm-md)
  - Avatar: 160px (w-40 h-40)
  - Stats: Grid 2 columnas
  - Transición a layout horizontal

- **Desktop**: > 768px (md+)
  - Avatar: 150px (fijo)
  - Stats: Grid 4 columnas
  - Layout horizontal
  - Hover overlay para cambiar foto

### Optimizaciones Móvil
1. **Touch-friendly**: Botón de upload más grande en móvil
2. **Truncate**: Email se trunca si es muy largo
3. **Flex-shrink**: Iconos no se reducen en pantallas pequeñas
4. **Responsive padding**: Menos padding en móvil (p-4) vs desktop (p-8)
5. **Font scaling**: Tamaños de texto adaptables (text-xl sm:text-2xl)

## 🎨 UX Mejorada

### Desktop
- **Hover**: Overlay oscuro con icono de cámara al pasar el mouse
- **Visual feedback**: Spinner de carga durante upload
- **Preview**: Vista previa inmediata de la imagen seleccionada

### Mobile
- **Botón flotante**: Icono de upload en esquina inferior derecha
- **Tap-friendly**: Área de toque más grande
- **Feedback visual**: Spinner en el botón durante carga

## 🧪 Testing

### Probar Upload Local
1. Iniciar servidor: `npm run dev`
2. Ir a http://localhost:3000/profile
3. **Desktop**: Hover sobre avatar → Click "Cambiar foto"
4. **Mobile**: Tap en botón de upload (esquina avatar)
5. Seleccionar imagen (JPG/PNG/GIF, max 2MB)
6. Verificar preview y spinner
7. Confirmar que la imagen se sube correctamente

### Verificar Responsive
```bash
# Simular diferentes dispositivos en Chrome DevTools
- iPhone SE (375px)
- iPad (768px)
- Desktop (1024px+)
```

## 🐛 Troubleshooting

### Error: "bucket does not exist"
→ Crear el bucket `profile-images` en Supabase Dashboard

### Error: "new row violates row-level security policy"
→ Configurar las políticas RLS según Paso 2

### Imagen no se ve después de subir
→ Verificar que el bucket sea **público** (public: true)

### Error de tamaño de archivo
→ La imagen debe ser menor a 2MB

## 📋 Archivos Modificados

1. ✅ `src/components/profile/AvatarUpload.tsx` (nuevo)
2. ✅ `src/app/[locale]/profile/page.tsx` (actualizado - mobile responsive)
3. ✅ `supabase/migrations/20250118_create_profile_images_bucket.sql` (migración storage)

## 🚀 Próximos Pasos

1. Configurar bucket en Supabase Dashboard (Paso 1 y 2)
2. Probar upload en localhost
3. Verificar responsive en diferentes dispositivos
4. Desplegar a producción
5. Probar en producción con usuario real
