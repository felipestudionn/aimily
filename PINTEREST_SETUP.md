# 📌 Pinterest OAuth - Guía de Configuración

## ✅ ESTADO ACTUAL: OAUTH COMPLETO

**Nota:** La app de Pinterest ha sido aprobada y está usando el flujo OAuth completo.

### Configuración Activa:
- ✅ Client ID configurado
- ✅ Client Secret configurado
- ✅ Redirect URIs configurados
- ✅ OAuth flow completo implementado

---

## 🚀 Pasos para Completar

### 1. Crear App en Pinterest Developers

Ve a: **https://developers.pinterest.com/apps/**

**Formulario:**
```
App name: aimily
Company: StudioNN Agency SL
Website: https://aimily.app
Privacy Policy: https://aimily.app/privacy

App purpose:
aimily is a fashion merchandising and collection planning platform that helps fashion brands create data-driven collections. Users connect their Pinterest boards to build creative moodboards, which are then analyzed by AI to generate strategic collection plans with trend insights, product recommendations, and financial projections.

Developer purpose: I am developing an app for my organization/personal use
Use case: Other - Reading user Pinterest boards and pins to create fashion collection moodboards and extract creative insights (colors, trends, items) for AI-powered merchandising recommendations.
```

**Redirect URIs:**
```
https://aimily.app/api/auth/pinterest/callback
http://localhost:3000/api/auth/pinterest/callback
```

**Scopes:**
- ✅ `boards:read`
- ✅ `pins:read`

---

### 2. Obtener Credenciales

Una vez aprobada la app, copia:
- **App ID** → `CLIENT_ID`
- **App secret** → `CLIENT_SECRET`

---

### 3. Configurar Variables de Entorno

#### **Desarrollo Local** (`.env.local`):

Añade estas líneas:
```bash
# Pinterest OAuth
NEXT_PUBLIC_PINTEREST_CLIENT_ID=tu_app_id
PINTEREST_CLIENT_SECRET=tu_app_secret
NEXT_PUBLIC_PINTEREST_REDIRECT_URI=http://localhost:3000/api/auth/pinterest/callback
```

#### **Producción** (Vercel):

Ejecuta estos comandos:

```bash
# CLIENT_ID (público)
vercel env add NEXT_PUBLIC_PINTEREST_CLIENT_ID
# Value: tu_app_id
# Environments: Production, Preview, Development

# CLIENT_SECRET (privado)
vercel env add PINTEREST_CLIENT_SECRET
# Value: tu_app_secret
# Environments: Production, Preview, Development
```

**Nota:** La variable `NEXT_PUBLIC_PINTEREST_REDIRECT_URI` ya está configurada en Vercel apuntando a `https://aimily.app/api/auth/pinterest/callback`

---

### 4. Re-desplegar

Después de añadir las variables, re-despliega:

```bash
git add .
git commit -m "chore: Add Pinterest OAuth credentials"
git push origin main
```

O manualmente:
```bash
vercel --prod
```

---

### 5. Probar la Integración

#### **Local:**
```bash
npm run dev
# Ve a http://localhost:3000/creative-space
# Click en "Connect Pinterest"
```

#### **Producción:**
```
# Ve a https://aimily.app/creative-space
# Click en "Connect Pinterest"
```

**Flujo esperado:**
1. Click en "Connect Pinterest"
2. Redirige a Pinterest login
3. Usuario autoriza la app
4. Redirige de vuelta a `/creative-space`
5. Mensaje "Pinterest Connected"
6. Boards del usuario visibles

---

## 🔍 Troubleshooting

### Error: "redirect_uri_mismatch"
**Causa:** La URL no coincide exactamente

**Solución:**
- Verifica en Pinterest Developers que tengas: `https://aimily.app/api/auth/pinterest/callback`
- NO uses `http://` en producción
- NO añadas `/` al final

### Error: "invalid_client"
**Causa:** CLIENT_SECRET incorrecto

**Solución:**
- Copia de nuevo el App secret de Pinterest
- Verifica que no haya espacios extra

### Error: "scope_not_approved"
**Causa:** Scopes no activados

**Solución:**
- Ve a Pinterest Developers → Tu app → Scopes
- Activa `boards:read` y `pins:read`

---

## 📚 Recursos

- **Pinterest Developers:** https://developers.pinterest.com/
- **API Documentation:** https://developers.pinterest.com/docs/api/v5/
- **OAuth Guide:** https://developers.pinterest.com/docs/getting-started/authentication/

---

## ✅ Checklist Final

- [ ] App creada en Pinterest
- [ ] Redirect URIs configurados
- [ ] Scopes activados
- [ ] Credenciales copiadas
- [ ] Variables añadidas a `.env.local`
- [ ] Variables añadidas a Vercel
- [ ] Re-deploy ejecutado
- [ ] Probado en local
- [ ] Probado en producción

---

**Cuando completes todos los pasos, Pinterest OAuth estará 100% funcional en aimily.**
