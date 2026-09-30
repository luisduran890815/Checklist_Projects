# Checklist de aceptación

## Autenticación
- [ ] Crear usuario y confirmar correo si aplica.
- [ ] Iniciar/cerrar sesión.
- [ ] Solicitar recuperación de contraseña.
- [ ] Verificar que un usuario no vea registros de otro usuario.

## CRUD
- [ ] Crear, editar y eliminar proveedor sin documentos relacionados.
- [ ] Crear, editar y eliminar cotización.
- [ ] Convertir cotización en orden.
- [ ] Crear, editar y eliminar orden.
- [ ] Validar restricciones de fechas y valores no negativos.

## Dashboard y Excel
- [ ] Probar búsqueda global.
- [ ] Combinar filtros por proveedor, estado y fechas.
- [ ] Confirmar que indicadores y tabla responden a filtros.
- [ ] Abrir el `.xlsx` y revisar sus cuatro hojas.

## PDF
- [ ] Subir PDF menor de 10 MB.
- [ ] Rechazar otro tipo de archivo o PDF mayor de 10 MB.
- [ ] Abrir URL temporal y eliminar adjunto.
- [ ] Confirmar aislamiento entre usuarios.

## Despliegue
- [ ] `npm run typecheck` sin errores.
- [ ] `npm run build` sin errores.
- [ ] Rutas internas sobreviven a recarga en Netlify.
- [ ] Variables `VITE_*` configuradas.
- [ ] URL de Netlify autorizada en Supabase Auth.
