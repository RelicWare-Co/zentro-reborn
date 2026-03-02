# 📋 Instrucciones para la Implementación de la Página de Productos

## 🎨 1. Flexibilidad de Diseño y UI
Tienes total libertad para modificar, mejorar o reconstruir el diseño actual de la página (`src/routes/products.tsx`) y los formularios, **siempre y cuando se mantenga la consistencia visual y de experiencia de usuario de la aplicación**. 
Asegúrate de seguir utilizando:
- La paleta de colores actual mediante variables CSS (`var(--color-void)`, `var(--color-photon)`, `var(--color-carbon)`, `var(--color-voltage)`).
- Los componentes base ubicados en la carpeta `src/components/ui/` (Tailwind + Radix UI/shadcn).

---

## 🏗️ 2. Estructura de Archivos (Server Functions)

Según la arquitectura recomendada por `@tanstack/react-start`, el código del backend no debe mezclarse con los componentes. Crea los siguientes archivos (puedes ubicarlos en una carpeta como `src/server/` o en `src/features/products/`):

- **`products.server.ts`**: Aquí irá la lógica exclusiva del servidor, como las consultas directas usando Drizzle ORM hacia el esquema de inventario.
- **`products.functions.ts`**: Aquí envolverás las funciones de `products.server.ts` utilizando `createServerFn`. Esto permite exportarlas y usarlas de manera segura (y con tipado) en el frontend.

---

## ⚙️ 3. Funciones del Servidor Necesarias

Debes implementar las siguientes funciones basadas en el esquema de la base de datos ubicado en `src/db/schema/inventory.schema.ts`:

### A. `getProducts` (GET)
- **Propósito**: Obtener la lista de productos activos para llenar la tabla principal.
- **Lógica de BD**:
  - Consultar la tabla `product`.
  - Debes filtrar los datos por `organizationId` (usando la organización del usuario autenticado).
  - **Importante**: Filtrar asegurando que `deletedAt` sea `null`, ya que el sistema utiliza eliminación lógica (*soft delete*).
  - Incluir (hacer un JOIN o relation) con la tabla `category` para obtener el nombre de la categoría del producto.

### B. `createProduct` (POST)
- **Propósito**: Crear un nuevo producto desde el formulario (o modal).
- **Validación**: Usar `.inputValidator()` con **Zod** para validar el payload de entrada.
- **Lógica de BD**:
  - `id`: Generar un ID (ej. usando `crypto.randomUUID()`).
  - `organizationId`: Tomarlo del contexto de autenticación del servidor.
  - `price`: El esquema define el precio como entero (COP). Maneja la conversión si el input es decimal.
  - `categoryId`: Cambiar el input actual por el ID de una categoría válida de la tabla `category`.
  - Llenar los campos `createdAt`, `trackInventory`, y `stock`.

### C. `deleteProduct` (POST)
- **Propósito**: Eliminar un producto (Ejecutado desde el Dropdown de acciones en la tabla).
- **Lógica de BD**: Implementar un **Soft Delete**. Hacer un `UPDATE` al registro igualando el campo `deletedAt` a la fecha/hora actual (timestamp). No utilices un `DELETE` de SQL.

### D. `updateProduct` (POST)
- **Propósito**: Editar la información de un producto (stock, nombre, precio, SKU).
- **Lógica de BD**: Actualizar los registros en la tabla `product` validando permisos/organización.

### E. `getCategories` (GET)
- **Propósito**: Retornar las categorías de la tabla `category` pertenecientes a la organización.

---

## 💻 4. Integración en el Frontend (`src/routes/products.tsx`)

Refactoriza la página para eliminar el estado local estático:

### A. Data Fetching (Carga de Datos)
- Utiliza `@tanstack/react-query` junto con tu Server Function: `useQuery({ queryFn: () => getProducts() })`.
- Añade un `loader` en la ruta para el pre-renderizado:
  ```tsx
  export const Route = createFileRoute('/products')({
    loader: () => getProducts(),
    component: ProductsPage,
  })
  ```

### B. Mutaciones y Actualización de UI
- Usa `useMutation` para acciones de escritura.
- Tras el éxito (`onSuccess`), invalida la query:
  ```tsx
  queryClient.invalidateQueries({ queryKey: ['products'] })
  ```

### C. Ajustes al Formulario
- Reemplaza el `Input` de categoría por un `<Select>` que consuma `getCategories()`.
- Asegúrate de mapear correctamente los campos del esquema (ej: `taxRate`, `cost`).

---

## 🛠️ Ejemplo Estructural (Referencia)

**`src/features/products/products.functions.ts`**
```tsx
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const getProducts = createServerFn({ method: 'GET' })
  .handler(async () => {
    // Lógica para obtener productos de la organización actual
    return [] 
  })

export const createProduct = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    name: z.string().min(1),
    sku: z.string().optional(),
    price: z.number().min(0),
    stock: z.number().min(0),
    categoryId: z.string().optional()
  }))
  .handler(async ({ data }) => {
    // Lógica de inserción en BD
    return { success: true }
  })
```
