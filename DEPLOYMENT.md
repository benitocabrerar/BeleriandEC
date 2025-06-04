# Villa Vista al Mar - Deployment Guide
# Guía completa de despliegue y configuración

## 🚀 Quick Start

### 1. Verificar el sitio web
- **Sitio Principal**: https://benitocabrerar.github.io/BeleriandEC/
- **Panel Admin**: https://benitocabrerar.github.io/BeleriandEC/admin.html
- **Credenciales**: admin / villa2025

### 2. Configurar APIs (Obligatorio para producción)

#### Firebase Setup
1. Ir a https://console.firebase.google.com
2. Crear nuevo proyecto "villa-vista-mar"
3. Habilitar:
   - Authentication (Email/Password)
   - Realtime Database
   - Storage
   - Hosting (opcional)
4. Copiar config al panel admin > APIs & Servicios

#### PayPal Setup
1. Ir a https://developer.paypal.com
2. Crear aplicación
3. Obtener Client ID y Secret
4. Configurar en panel admin

#### Stripe Setup
1. Ir a https://dashboard.stripe.com
2. Obtener API keys
3. Configurar webhooks para eventos de pago
4. Configurar en panel admin

### 3. Personalización

#### Cambiar información de la propiedad
1. Panel Admin > Contenido
2. Actualizar textos, precios, ubicación
3. Cambiar número de WhatsApp en el código

#### Subir imágenes
1. Panel Admin > APIs & Servicios > Firebase
2. Usar Firebase Storage para imágenes
3. Actualizar URLs en el contenido

## 🔧 Configuración Avanzada

### Webhooks de PayPal
```
URL: https://tu-dominio.com/api/webhooks/paypal
Eventos: PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED
```

### Webhooks de Stripe
```
URL: https://tu-dominio.com/api/webhooks/stripe
Eventos: payment_intent.succeeded, payment_intent.payment_failed
```

### Firebase Security Rules
```javascript
{
  "rules": {
    "reservations": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "calendar": {
      ".read": true,
      ".write": "auth != null"
    },
    "settings": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## 📱 PWA Installation

### Para usuarios (automático)
1. Visitar el sitio web
2. Click en "Instalar App" cuando aparezca
3. La app se instalará como aplicación nativa

### Para desarrolladores
1. Verificar manifest.json
2. Verificar service worker (sw.js)
3. Testing: Chrome DevTools > Application > Manifest

## 🌐 Custom Domain Setup

### GitHub Pages con dominio personalizado
1. Settings > Pages
2. Custom domain: tu-dominio.com
3. Crear CNAME record en tu DNS
4. Habilitar HTTPS

### Cloudflare (Recomendado)
1. Agregar sitio en Cloudflare
2. Configurar DNS records
3. Habilitar SSL/TLS Full
4. Activar Rocket Loader y Auto Minify

## 📊 Analytics Setup

### Google Analytics
```html
<!-- Agregar en <head> de index.html y admin.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Facebook Pixel (opcional)
```html
<!-- Para marketing de Facebook/Instagram -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window,document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'YOUR_PIXEL_ID');
  fbq('track', 'PageView');
</script>
```

## 🔒 Security Checklist

### Frontend Security
- [x] HTTPS habilitado
- [x] Content Security Policy
- [x] API keys en variables de entorno
- [x] Validación de inputs
- [x] Sanitización de datos

### Backend Security
- [ ] Rate limiting en APIs
- [ ] Autenticación JWT
- [ ] Validación de webhooks
- [ ] Logs de seguridad
- [ ] Backup automático

## 📈 Performance Optimization

### Images
```bash
# Optimizar imágenes antes de subir
npm install -g imagemin-cli
imagemin images/*.jpg --out-dir=images/optimized --plugin=imagemin-mozjpeg
```

### Caching Strategy
```javascript
// En sw.js - ya configurado
const CACHE_NAME = 'villa-vista-v1';
const urlsToCache = [
  '/',
  '/admin.html',
  '/firebase-config.js',
  '/payment-service.js'
];
```

## 📞 Support & Maintenance

### Monitoring
1. Configurar alertas en Firebase
2. Monitorear uptime con Pingdom/UptimeRobot
3. Revisar logs regularmente

### Backup Strategy
1. Export automático de Firebase cada semana
2. Backup de configuraciones
3. Versionado de código en Git

### Updates
1. Actualizar dependencias mensualmente
2. Revisar security patches
3. Testing en staging antes de producción

## 🎯 Marketing Integration

### WhatsApp Business
1. Configurar WhatsApp Business API
2. Templates de mensajes aprobados
3. Integración con chat del sitio

### Email Marketing
1. Configurar SendGrid templates
2. Secuencias de email automáticas
3. Newsletter para huéspedes recurrentes

### Social Media
1. Integrar Instagram Basic Display
2. Auto-posting de disponibilidad
3. Reviews automáticas a Google

## 🔧 Troubleshooting

### Problemas comunes
1. **Firebase no conecta**: Verificar API keys y reglas
2. **Pagos fallan**: Verificar webhooks y SSL
3. **PWA no instala**: Verificar manifest y SW
4. **Chat no funciona**: Verificar permisos Firebase

### Logs útiles
```javascript
// En consola del browser
localStorage.getItem('villa_vista_config')
window.dbService
window.paymentService
window.chatService
```

## 📋 Pre-Launch Checklist

### Funcionalidad
- [ ] Reservas funcionando
- [ ] Pagos procesando correctamente
- [ ] Chat en tiempo real
- [ ] Notificaciones activas
- [ ] Analytics configurados

### Contenido
- [ ] Textos revisados
- [ ] Imágenes optimizadas
- [ ] Precios actualizados
- [ ] Contacto correcto
- [ ] Políticas publicadas

### SEO
- [ ] Meta tags completos
- [ ] Sitemap generado
- [ ] Google Business Profile
- [ ] Schema markup
- [ ] Page Speed > 90

### Legal
- [ ] Términos y condiciones
- [ ] Política de privacidad
- [ ] GDPR compliance
- [ ] Registro mercantil
- [ ] Seguros actualizados

---

## 🎉 ¡Listo para Producción!

Tu sistema Villa Vista al Mar está completamente configurado con:
- ✅ Base de datos Firebase
- ✅ Pagos PayPal & Stripe
- ✅ Chat en tiempo real
- ✅ Sistema de facturación
- ✅ Analytics avanzados
- ✅ PWA instalable
- ✅ Panel admin completo

**¡Solo configura las API keys y empieza a recibir reservas!**