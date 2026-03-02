# POS Backend Log

## Objetivo
Implementar el backend profesional del POS usando SQLite + Drizzle, tomando como base `src/db/schema/pos.schema.ts` y el patrón de `src/features/products/`.

## Features del POS derivadas del schema
1. **Gestión de turnos (shift)**: apertura/cierre por cajero y terminal.
2. **Movimientos de caja (cash_movement)**: ingreso manual, gasto operativo y pago a proveedor.
3. **Arqueo de cierre (shift_closure)**: esperado vs contado por método de pago.
4. **Checkout de venta (sale + sale_item + sale_item_modifier)**: items, modificadores, impuestos, descuentos y total.
5. **Pagos múltiples (payment)**: split payment por método y referencia.
6. **Venta a crédito (credit_account + credit_transaction)**: cargo a saldo pendiente del cliente.
7. **Impacto en inventario (inventory_movement + product.stock)**: descuento de stock por venta para productos con `trackInventory`.
8. **Aislamiento por organización**: todas las operaciones filtradas por `organizationId`.

## Implementado
- [x] `src/features/pos/pos.server.ts` (fachada pública)
- [x] Modularización interna en `src/features/pos/server/`
  - [x] `types.ts` (contratos y constantes)
  - [x] `auth-context.ts` (sesión + organización activa)
  - [x] `utils.ts` (normalización y validaciones numéricas/fechas)
  - [x] `shifts.ts` (bootstrap, apertura/cierre y movimientos de caja)
  - [x] `sales.ts` (checkout transaccional de ventas)
- [x] Lógica POS preservada sin cambios funcionales
  - [x] Contexto auth + organización activa
  - [x] Bootstrap POS (turno activo, catálogo, clientes)
  - [x] Apertura de turno
  - [x] Registro de movimientos de caja
  - [x] Resumen de cierre de turno
  - [x] Cierre de turno con arqueo por método
  - [x] Checkout transaccional de venta (ventas, items, modifiers, pagos, inventario, crédito)
- [x] `src/features/pos/pos.functions.ts`
  - [x] Server functions con `createServerFn`
  - [x] Validación de entradas con Zod

## Pendiente
- [ ] Conectar la UI de `src/routes/_auth/pos.tsx` al backend real (reemplazar mocks).
- [ ] Ajustar UX de pagos/cierre según reglas exactas de negocio finales.
- [ ] Añadir tests específicos de flujo POS (turno, venta, cierre, crédito).

## Verificación técnica
- [ ] Lint global (`bun --bun run lint`) *(falla por issues preexistentes del repo, no del POS)*.
- [ ] Tests (`bun --bun run test`) *(falla porque el proyecto no tiene archivos de test)*.
- [x] Build (`bun --bun run build`)
- [x] Biome check de archivos POS (`bunx --bun biome check src/features/pos/**/*.ts`)
