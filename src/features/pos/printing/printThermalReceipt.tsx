import { useEffect } from "react";
import { createRoot } from "react-dom/client";

const PRINT_WINDOW_STYLES = `
	:root {
		color-scheme: light;
	}

	* {
		box-sizing: border-box;
	}

	html, body {
		margin: 0;
		padding: 0;
		background: #fff;
	}

	body {
		padding: 0;
	}

	@page {
		size: 80mm auto;
		margin: 6mm;
	}

	@media print {
		body {
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
	}
`;

export function printThermalReceipt({
	title,
	content,
}: {
	title: string;
	content: React.ReactNode;
}) {
	if (typeof window === "undefined") {
		return false;
	}

	const iframe = window.document.createElement("iframe");
	iframe.setAttribute("aria-hidden", "true");
	iframe.style.position = "fixed";
	iframe.style.right = "0";
	iframe.style.bottom = "0";
	iframe.style.width = "0";
	iframe.style.height = "0";
	iframe.style.opacity = "0";
	iframe.style.pointerEvents = "none";
	iframe.style.border = "0";
	window.document.body.appendChild(iframe);

	const iframeWindow = iframe.contentWindow;
	const iframeDocument = iframe.contentDocument;

	if (!iframeWindow || !iframeDocument) {
		iframe.remove();
		return false;
	}

	iframeDocument.open();
	iframeDocument.write(`<!DOCTYPE html>
<html lang="es">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>${escapeHtml(title)}</title>
		<style>${PRINT_WINDOW_STYLES}</style>
	</head>
	<body>
		<div id="print-root"></div>
	</body>
</html>`);
	iframeDocument.close();

	const rootElement = iframeDocument.getElementById("print-root");

	if (!rootElement) {
		iframe.remove();
		return false;
	}

	const root = createRoot(rootElement);
	let isCleanedUp = false;

	const cleanup = () => {
		if (isCleanedUp) {
			return;
		}

		isCleanedUp = true;
		root.unmount();
		iframe.remove();
	};

	iframeWindow.onafterprint = cleanup;

	root.render(
		<PrintLifecycle
			onReady={() => {
				iframeWindow.focus();
				iframeWindow.print();

				window.setTimeout(() => {
					cleanup();
				}, 1000);
			}}
		>
			{content}
		</PrintLifecycle>,
	);

	return true;
}

function PrintLifecycle({
	children,
	onReady,
}: {
	children: React.ReactNode;
	onReady: () => void;
}) {
	useEffect(() => {
		const timeoutId = window.setTimeout(onReady, 60);
		return () => window.clearTimeout(timeoutId);
	}, [onReady]);

	return <>{children}</>;
}

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}
