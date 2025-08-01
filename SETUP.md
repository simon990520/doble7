# 🔧 Configuración para Desarrollo Local

## Problema Actual
El error `auth/captcha-check-failed` indica que el dominio local no está autorizado en Firebase.

## Solución

### 1. Configurar Firebase Console
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto `boble7-7191a`
3. Ve a **Authentication** → **Settings** → **Authorized domains**
4. Agrega estos dominios:
   - `localhost`
   - `127.0.0.1`
   - `localhost:8080`
   - `127.0.0.1:8080`

### 2. Ejecutar Servidor Local
```bash
# En la carpeta mvp-inversion
npm install
npm run dev
```

### 3. Acceder a la Aplicación
- Abre tu navegador
- Ve a `http://localhost:8080`
- Prueba el login con tu número de teléfono

## Notas Importantes
- Asegúrate de incluir el código de país (+57 para Colombia)
- El número debe estar en formato internacional
- Ejemplo: `+573001234567`

## Troubleshooting
Si sigues teniendo problemas:
1. Verifica que el dominio esté en la lista de autorizados
2. Limpia el caché del navegador
3. Intenta en modo incógnito
4. Verifica que el número de teléfono sea válido 