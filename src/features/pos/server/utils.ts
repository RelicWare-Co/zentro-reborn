export function normalizeOptionalString(value?: string | null) {
	if (value == null) {
		return null;
	}

	const normalized = value.trim();
	return normalized.length > 0 ? normalized : null;
}

export function normalizeRequiredString(value: string, fieldName: string) {
	const normalized = value.trim();
	if (normalized.length === 0) {
		throw new Error(`El campo "${fieldName}" es obligatorio`);
	}
	return normalized;
}

export function toNonNegativeInteger(value: number, fieldName: string) {
	if (!Number.isFinite(value) || value < 0) {
		throw new Error(
			`El campo "${fieldName}" debe ser un número válido mayor o igual a 0`,
		);
	}
	return Math.round(value);
}

export function toPositiveInteger(value: number, fieldName: string) {
	const normalized = toNonNegativeInteger(value, fieldName);
	if (normalized <= 0) {
		throw new Error(
			`El campo "${fieldName}" debe ser un número válido mayor a 0`,
		);
	}
	return normalized;
}

export function resolveDate(input: number | undefined, fieldName: string) {
	if (input === undefined) {
		return new Date();
	}

	return new Date(toNonNegativeInteger(input, fieldName));
}

export function toTimestamp(value: Date | number | null | undefined) {
	if (value == null) {
		return null;
	}

	if (value instanceof Date) {
		return value.getTime();
	}

	return value;
}
