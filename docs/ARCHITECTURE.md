# Arquitectura

## Capas

1. **Presentación:** React + TypeScript + CSS, con componentes de formularios, tablas, dashboard y autenticación.
2. **Servicios:** `src/services/api.ts` abstrae modo demo y Supabase para que la interfaz use la misma API.
3. **Datos:** PostgreSQL administrado por Supabase, Auth para identidades y Storage para PDFs.
4. **Entrega:** Vite genera `dist`; Netlify sirve la SPA y GitHub Actions valida cada cambio.

## Flujo de seguridad

- Supabase Auth emite la sesión del usuario.
- Cada tabla raíz contiene `owner_id default auth.uid()`.
- Las políticas RLS comparan `owner_id` o el propietario del documento padre.
- Storage usa una carpeta raíz con el UUID del usuario.
- Los PDFs son privados y se consultan mediante URL firmada por 60 segundos.
- El navegador solo recibe la clave pública `anon`; RLS es la frontera efectiva de autorización.

## Decisiones

- Los totales se generan en PostgreSQL (`subtotal + tax`) para evitar inconsistencias.
- Las líneas de documentos están normalizadas aunque la primera interfaz gestione el total consolidado.
- Los adjuntos usan relación polimórfica controlada por `entity_type` + `entity_id`.
- El modo demo usa `localStorage` y permite revisar la experiencia sin infraestructura.
