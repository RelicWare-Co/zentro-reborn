import {
	Button,
	Divider,
	Group,
	Modal,
	Text,
	Textarea,
	TextInput,
} from "@mantine/core";
import { useEffect, useId } from "react";
import type { ActiveShift, ShiftCloseSummary } from "../../types";
import { formatCurrency, formatPaymentMethodLabel } from "../../utils";

interface CloseShiftModalProps {
	isOpen: boolean;
	onClose: () => void;
	activeShift: ActiveShift | null;
	shiftCloseSummary: ShiftCloseSummary | undefined;
	isLoading: boolean;
	closureAmounts: Record<string, string>;
	setClosureAmounts: (amounts: Record<string, string>) => void;
	closeShiftNotes: string;
	setCloseShiftNotes: (value: string) => void;
	hasInvalidAmounts: boolean;
	isClosing: boolean;
	error: Error | null;
	onConfirm: () => void;
}

export function CloseShiftModal({
	isOpen,
	onClose,
	activeShift,
	shiftCloseSummary,
	isLoading,
	closureAmounts,
	setClosureAmounts,
	closeShiftNotes,
	setCloseShiftNotes,
	hasInvalidAmounts,
	isClosing,
	error,
	onConfirm,
}: CloseShiftModalProps) {
	const closeShiftNotesId = useId();

	// Initialize closure amounts when summary is loaded
	useEffect(() => {
		if (!shiftCloseSummary) return;

		setClosureAmounts(
			Object.fromEntries(
				shiftCloseSummary.summaryByMethod.map((row) => [
					row.paymentMethod,
					row.actualAmount != null
						? String(row.actualAmount)
						: row.paymentMethod === "cash"
							? ""
							: String(row.expectedAmount),
				]),
			),
		);
	}, [shiftCloseSummary, setClosureAmounts]);

	const cashSummary = shiftCloseSummary?.summaryByMethod.find(
		(row) => row.paymentMethod === "cash",
	);

	return (
		<Modal
			opened={isOpen}
			onClose={onClose}
			title="Cierre de Turno"
			size={500}
			classNames={{
				content: "bg-[#151515] border border-gray-800 text-white",
				header: "bg-[#151515] text-white",
				title: "text-white font-semibold",
				body: "pt-2",
			}}
		>
			<div className="py-2 space-y-6">
				<div className="bg-[#0a0a0a] rounded-lg p-4 border border-gray-800">
					<Text className="text-sm font-medium text-gray-400 mb-3">
						Resumen del Sistema
					</Text>
					{isLoading && <Text className="text-sm text-gray-400">Cargando resumen...</Text>}
					{shiftCloseSummary && (
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-gray-300">Base inicial</span>
								<span className="text-white font-medium tabular-nums">
									{formatCurrency(shiftCloseSummary.shift.startingCash)}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-300">Efectivo esperado</span>
								<span className="text-white font-medium tabular-nums">
									{formatCurrency(cashSummary?.expectedAmount ?? 0)}
								</span>
							</div>
							<Divider className="my-2 border-gray-700" />
							{shiftCloseSummary.summaryByMethod
								.filter((row) => row.paymentMethod !== "cash")
								.map((row) => (
									<div
										key={`expected-${row.paymentMethod}`}
										className="flex justify-between"
									>
										<span className="text-gray-300">
											{formatPaymentMethodLabel(row.paymentMethod)}
										</span>
										<span className="text-white font-medium tabular-nums">
											{formatCurrency(row.expectedAmount)}
										</span>
									</div>
								))}
							<Divider className="my-2 border-gray-700" />
							<div className="flex justify-between text-base">
								<span className="text-gray-200 font-semibold">Total Esperado</span>
								<span className="text-[var(--color-voltage)] font-bold tabular-nums">
									{formatCurrency(shiftCloseSummary.totalExpected)}
								</span>
							</div>
						</div>
					)}
				</div>

				{shiftCloseSummary && (
					<div className="grid gap-3">
						{shiftCloseSummary.summaryByMethod.map((row) => (
							<div key={row.paymentMethod} className="grid gap-2">
								<label
									htmlFor={`closure-${row.paymentMethod}`}
									className="text-sm font-medium text-gray-300"
								>
									{formatPaymentMethodLabel(row.paymentMethod)} (Esperado:{" "}
									{formatCurrency(row.expectedAmount)})
								</label>
								<TextInput
									id={`closure-${row.paymentMethod}`}
									type="number"
									placeholder="0"
									leftSection="$"
									value={closureAmounts[row.paymentMethod] ?? ""}
									onChange={(event) =>
										setClosureAmounts({
											...closureAmounts,
											[row.paymentMethod]: event.target.value,
										})
									}
									classNames={{
										input:
											"bg-[#0a0a0a] border-gray-800 text-white focus:border-[var(--color-voltage)]",
										section: "text-gray-500",
									}}
								/>
								{closureAmounts[row.paymentMethod] && (
									<div
										className={`text-sm mt-1 flex items-center justify-between tabular-nums ${
											Number(closureAmounts[row.paymentMethod]) - row.expectedAmount ===
											0
												? "text-green-400"
												: "text-red-400"
										}`}
									>
										<span>Diferencia:</span>
										<span className="font-semibold">
											{formatCurrency(
												Number(closureAmounts[row.paymentMethod]) - row.expectedAmount,
											)}
										</span>
									</div>
								)}
							</div>
						))}
					</div>
				)}

				<div className="grid gap-2">
					<label htmlFor={closeShiftNotesId} className="text-sm font-medium text-gray-300">
						Notas de cierre
					</label>
					<Textarea
						id={closeShiftNotesId}
						placeholder="Opcional: explica diferencias o novedades del cierre"
						value={closeShiftNotes}
						onChange={(event) => setCloseShiftNotes(event.target.value)}
						minRows={3}
						classNames={{
							input:
								"bg-[#0a0a0a] border-gray-800 text-white focus:border-[var(--color-voltage)]",
						}}
					/>
				</div>

				{error instanceof Error && <Text className="text-sm text-red-400">{error.message}</Text>}

				<Group justify="flex-end" mt="sm">
					<Button variant="subtle" color="gray" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						onClick={onConfirm}
						disabled={
							!activeShift ||
							!shiftCloseSummary ||
							hasInvalidAmounts ||
							isLoading ||
							isClosing
						}
						className="bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 border border-red-900/50"
					>
						{isClosing ? "Cerrando..." : "Cerrar Turno Definitivamente"}
					</Button>
				</Group>
			</div>
		</Modal>
	);
}
