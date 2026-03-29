# Module Template

Usa este patrón cuando agregues un módulo nuevo a la app.

## 1. Crear el descriptor del módulo

Archivo sugerido: `src/features/<module>/<module>.module.ts`

Responsabilidades:

- definir el `toggle` operativo del módulo
- definir los settings propios del módulo
- exportar defaults y schemas zod
- registrar navegación opcional
- encapsular los selectors del módulo para no leer `settings` directamente desde otros features

Ejemplo mínimo:

```ts
import { z } from "zod";
import type { OrganizationSettings } from "#/features/settings/settings.shared";
import { defineModule } from "#/features/modules/module-definition";

export const sampleModuleToggleSettingsSchema = z.object({
	enabled: z.boolean(),
});

export const sampleModuleSettingsSchema = z.object({
	exampleFlag: z.boolean(),
});

export const sampleModuleDefinition = defineModule({
	key: "sample",
	label: "Sample",
	activationPolicy: "entitled_self_service",
	defaultEntitlementStatus: "blocked",
	getEnabled: (settings: OrganizationSettings) => settings.modules.sample.enabled,
	getFlags: (settings: OrganizationSettings) => ({
		exampleFlag: settings.sample.exampleFlag,
	}),
	getNavigation: ({ accessible, flags }) =>
		accessible && flags.exampleFlag
			? [
					{
						id: "sample",
						label: "Sample",
						path: "/sample",
						order: 40,
						icon: "package",
					},
			  ]
			: [],
});
```

## 2. Registrarlo

Archivo: `src/features/modules/module-registry.ts`

- agrega el descriptor al `MODULE_REGISTRY`
- usa el `key` del registro para entitlements, navegación y capabilities

## 3. Mantener el core limpio

Regla práctica:

- `core`: ventas base, auth, inventario transversal, utilidades de checkout
- `module`: flujos operativos específicos del negocio, settings propios, rutas, paneles y CRUD del módulo

Si un flujo puede ser reutilizado por POS y por otro módulo, muévelo al core antes de volverlo a usar.

## 4. Integración mínima

Cada módulo nuevo debería tener, como mínimo:

- `<module>.module.ts`
- `<module>.server.ts`
- `<module>.functions.ts`
- `hooks/use-<module>.ts`
- tests del servidor del módulo
- una ruta principal y, si hace falta, componentes propios de settings
