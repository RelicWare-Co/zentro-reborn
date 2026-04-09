import { ThermalReceipt } from "@/features/pos/components/ThermalReceipt";
import { printReceiptAsPdf } from "@/features/pos/printing/print-receipt-as-pdf";
import { getPosPrinterManager } from "@/features/pos/printing/printer-manager";
import { readPosLocalPrinterSettings } from "@/features/pos/printing/printer-settings.local";
import type { ThermalReceiptDocument } from "@/features/pos/printing/thermal-receipt-document";

function isBrowserEnvironment() {
	return typeof window !== "undefined";
}

export async function printThermalReceipt(document: ThermalReceiptDocument) {
	if (!isBrowserEnvironment()) {
		return false;
	}

	const settings = readPosLocalPrinterSettings();
	if (settings.outputMode === "pdf") {
		return printReceiptAsPdf(document);
	}

	try {
		await getPosPrinterManager().printReceipt(document);
		return true;
	} catch (error) {
		console.error(
			"No se pudo imprimir en impresora POS, fallback a PDF",
			error,
		);
		return printReceiptAsPdf(document);
	}
}

export async function connectPosPrinter() {
	if (!isBrowserEnvironment()) {
		return false;
	}

	await getPosPrinterManager().connectWithPrompt();
	return true;
}

export async function reconnectPosPrinter(options?: { silent?: boolean }) {
	if (!isBrowserEnvironment()) {
		return false;
	}

	return getPosPrinterManager().reconnectSaved(readPosLocalPrinterSettings(), {
		silent: options?.silent,
	});
}

export async function disconnectPosPrinter() {
	if (!isBrowserEnvironment()) {
		return false;
	}

	await getPosPrinterManager().disconnect();
	return true;
}

export async function openPosCashDrawer() {
	if (!isBrowserEnvironment()) {
		return false;
	}

	await getPosPrinterManager().openCashDrawer();
	return true;
}

export function buildPosPrinterTestDocument(): ThermalReceiptDocument {
	const issuedAt = new Intl.DateTimeFormat("es-CO", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date());

	const receipt = {
		title: "Prueba de impresión",
		documentLabel: "Ticket de validación",
		issuedAtLabel: issuedAt,
		statusLabel: "Estado: Conectado",
		infoLines: [
			{ label: "Sistema", value: "Zentro POS" },
			{ label: "Canal", value: "Ajustes > Impresión local" },
		],
		items: [
			{
				label: "Item de prueba",
				quantity: 1,
				unitPriceLabel: "$ 1.000 c/u",
				totalLabel: "$ 1.000",
				secondaryLines: ["Verifica texto, acentos y alineación"],
			},
		],
		payments: [
			{
				label: "Efectivo",
				amountLabel: "$ 1.000",
			},
		],
		totals: [
			{
				label: "Total",
				value: "$ 1.000",
				emphasis: true,
			},
		],
		footerLines: ["Si ves este mensaje, la impresora responde correctamente."],
	};

	return {
		title: "Prueba impresora POS",
		receipt,
		content: <ThermalReceipt {...receipt} />,
	};
}

export async function printPosPrinterTestDocument() {
	return printThermalReceipt(buildPosPrinterTestDocument());
}
