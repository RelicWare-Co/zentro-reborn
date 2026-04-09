declare module "@point-of-sale/receipt-printer-encoder" {
	export default class ReceiptPrinterEncoder {
		constructor(options?: Record<string, unknown>);
		get columns(): number;
		initialize(): this;
		codepage(value: string): this;
		align(value: "left" | "center" | "right"): this;
		bold(value?: boolean): this;
		line(value: string): this;
		rule(options?: { style?: "single" | "double"; width?: number }): this;
		table(
			columns: Array<{ width: number; align: "left" | "center" | "right" }>,
			data: Array<Array<string | ((encoder: ReceiptPrinterEncoder) => void)>>,
		): this;
		newline(value?: number): this;
		cut(value?: "full" | "partial"): this;
		pulse(device?: number, on?: number, off?: number): this;
		encode(format?: "array" | "lines" | "commands"): Uint8Array;
	}
}

declare module "@point-of-sale/webusb-receipt-printer" {
	export default class WebUSBReceiptPrinter {
		connect(): Promise<void>;
		reconnect(device: unknown): Promise<void>;
		disconnect(): Promise<void>;
		listen(): Promise<boolean>;
		print(data: Uint8Array | ArrayLike<number>): Promise<void>;
		addEventListener(
			event: string,
			listener: (...args: unknown[]) => void,
		): void;
	}
}

declare module "@point-of-sale/webserial-receipt-printer" {
	export default class WebSerialReceiptPrinter {
		constructor(options?: Record<string, unknown>);
		connect(): Promise<void>;
		reconnect(device: unknown): Promise<void>;
		disconnect(): Promise<void>;
		listen(): Promise<boolean>;
		print(data: Uint8Array | ArrayLike<number>): Promise<void>;
		addEventListener(
			event: string,
			listener: (...args: unknown[]) => void,
		): void;
	}
}

declare module "@point-of-sale/webbluetooth-receipt-printer" {
	export default class WebBluetoothReceiptPrinter {
		connect(): Promise<void>;
		reconnect(device: unknown): Promise<void>;
		disconnect(): Promise<void>;
		listen(): Promise<boolean>;
		print(data: Uint8Array | ArrayLike<number>): Promise<void>;
		addEventListener(
			event: string,
			listener: (...args: unknown[]) => void,
		): void;
	}
}

declare module "@point-of-sale/receipt-printer-status" {
	export type ReceiptPrinterInfo = {
		online: boolean;
		coverOpened: boolean;
		paperLoaded: boolean;
		paperLow: boolean;
	};

	export default class ReceiptPrinterStatus {
		constructor(options: { printer: unknown; language?: string });
		connected: boolean;
		language: string;
		status: ReceiptPrinterInfo;
		cashDrawer: {
			open(): void;
			opened: boolean;
			addEventListener(
				event: string,
				listener: (...args: unknown[]) => void,
			): void;
		};
		addEventListener(
			event: string,
			listener: (...args: unknown[]) => void,
		): void;
	}
}
