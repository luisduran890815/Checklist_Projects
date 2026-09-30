# Procura Suite

Aplicación web de control de compras lista para GitHub, Netlify y Supabase. Incluye autenticación, CRUD de proveedores/cotizaciones/órdenes, dashboard filtrable, exportación real a Excel y adjuntos PDF privados.

## Funcionalidades

- **Autenticación:** registro, login, persistencia de sesión, cierre de sesión y recuperación de contraseña con Supabase Auth.
- **Proveedores:** crear, consultar, editar y eliminar; estado activo/inactivo.
- **Cotizaciones:** CRUD, vigencia, estados, subtotal/impuestos/total y conversión directa a orden.
- **Órdenes de compra:** CRUD, vínculo opcional a cotización y trazabilidad de entrega/estado.
- **Dashboard:** indicadores, gráfico de seis meses, pulso operativo, búsqueda y filtros por proveedor, estado y fechas.
- **Excel:** libro `.xlsx` con hojas Resumen, Cotizaciones, Órdenes y Proveedores; respeta los filtros activos.
- **PDF:** carga, consulta con URL firmada y eliminación de adjuntos de hasta 10 MB en un bucket privado.
- **Seguridad:** Row Level Security en todas las tablas; cada usuario solo accede a sus propios datos.
- **Modo demo:** funciona sin configurar Supabase usando `localStorage`, con datos ficticios identificados como demo.
- **Responsive:** interfaz adaptada a escritorio, tablet y móvil.

## Inicio rápido

Requisitos: Node.js 20+ y npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Sin variables válidas de Supabase, la aplicación entra automáticamente en modo demo. Usa el correo y contraseña precargados (`demo@procura.local` / `Demo123!`) o cualquier correo con una contraseña de al menos 6 caracteres.

## Conectar Supabase

1. Crea un proyecto en Supabase.
2. Instala y autentica la CLI:
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref TU_PROJECT_REF
   supabase db push
   ```
3. En **Authentication → URL Configuration** agrega:
   - `http://localhost:5173`
   - la URL final de Netlify, por ejemplo `https://tu-sitio.netlify.app`
4. Copia `.env.example` a `.env` y configura:
   ```env
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=TU_CLAVE_ANON_PUBLICA
   VITE_DEMO_MODE=false
   ```
5. Reinicia `npm run dev`.

La migración `supabase/migrations/20260930000000_init.sql` crea tablas, índices, restricciones, triggers, RLS y el bucket privado `attachments`.

> Usa exclusivamente la clave **anon/public** en el frontend. Nunca expongas la `service_role`.

## GitHub

```bash
git init
git add .
git commit -m "feat: initial Procura Suite"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/procura-suite.git
git push -u origin main
```

El workflow `.github/workflows/ci.yml` ejecuta typecheck y build en cada push o pull request a `main`.

## Netlify

### Opción A: interfaz de Netlify

1. **Add new site → Import an existing project** y selecciona el repositorio.
2. Netlify detectará `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. En **Site configuration → Environment variables** agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_DEMO_MODE=false`
4. Despliega y registra la URL resultante en Supabase Auth.

### Opción B: CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify env:set VITE_SUPABASE_URL "https://TU-PROYECTO.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "TU_CLAVE_ANON_PUBLICA"
netlify env:set VITE_DEMO_MODE "false"
netlify deploy --build --prod
```

La redirección SPA y cabeceras de seguridad están definidas en `netlify.toml`.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run typecheck` | Validación TypeScript |
| `npm run build` | Compilación de producción |
| `npm run preview` | Vista previa de `dist` |

## Estructura

```text
procura-suite/
├── .github/workflows/ci.yml
├── public/_redirects
├── src/
│   ├── lib/supabase.ts
│   ├── services/api.ts
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   └── types.ts
├── supabase/
│   ├── migrations/20260930000000_init.sql
│   ├── config.toml
│   └── seed.sql
├── .env.example
├── netlify.toml
├── package.json
└── README.md
```

## Modelo de datos

- `profiles`: perfil básico asociado a `auth.users`.
- `suppliers`: directorio de proveedores.
- `quotes` y `quote_items`: cotizaciones y líneas normalizadas.
- `purchase_orders` y `purchase_order_items`: órdenes y líneas normalizadas.
- `attachments`: metadatos de PDF; el archivo vive en Supabase Storage.

La interfaz actual administra totales a nivel de documento. Las tablas de líneas ya están preparadas para ampliar el detalle por ítem sin cambiar el núcleo del modelo.

## Consideraciones para producción

- Configura un proveedor SMTP en Supabase para confirmaciones y recuperación de contraseña.
- Mantén la confirmación de correo activa si el entorno lo requiere.
- Define backups y retención en Supabase según la política de la organización.
- Sustituye los datos demo por datos reales solo después de validar permisos.
- Para multitenencia por empresa/equipo, añade `organization_id` y políticas por membresía; la versión actual aísla datos por usuario.

## Licencia

MIT.
