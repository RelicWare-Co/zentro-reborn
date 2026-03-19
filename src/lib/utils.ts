import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const moneyInputFormatter = new Intl.NumberFormat("es-CO", {
	maximumFractionDigits: 0,
});

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function sanitizeMoneyInput(value: string) {
	return value.replace(/\D/g, "");
}

export function parseMoneyInput(value: string | number | null | undefined) {
	if (typeof value === "number") {
		return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
	}

	const normalizedValue = sanitizeMoneyInput(value ?? "");
	return normalizedValue ? Number(normalizedValue) : 0;
}

export function formatMoneyInput(value: string | number | null | undefined) {
	if (value == null) {
		return "";
	}

	const normalizedValue =
		typeof value === "number"
			? String(Math.max(0, Math.trunc(value)))
			: sanitizeMoneyInput(value);

	return normalizedValue
		? moneyInputFormatter.format(Number(normalizedValue))
		: "";
}
