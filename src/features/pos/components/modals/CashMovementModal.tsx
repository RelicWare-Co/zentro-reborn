import {
	Button,
	Group,
	Modal,
	NativeSelect,
	Text,
	TextInput,
} from "@mantine/core";
import { useId } from "react";
import type { CashMovementType } from "../../types";

interface CashMovementModalProps {
	isOpen: boolean;
	onClose: () => void;
	movementType: string;
	setMovementType: (value: CashMovementType) => void;
	movementAmount: string;
	setMovementAmount: (value: string) => void;
	movementDescription: string;
	setMovementDescription: (value: string) => void;
	canRegister: boolean;
	isRegistering: boolean;
	hasActiveShift: boolean;
	error: Error | null;
	onConfirm: () => void;
}

export function CashMovementModal({
	isOpen,
	onClose,
	movementType,
	setMovementType,
	movementAmount,
	setMovementAmount,
	movementDescription,
	setMovementDescription,
	canRegister,
	isRegistering,
	hasActiveShift,
	error,
	onConfirm,
}: CashMovementModalProps) {
	const movementTypeId = useId();
	const movementAmountId = useId();
	const movementDescriptionId = useId();

	return (
		<Modal
			opened={isOpen}
			onClose={onClose}
			title="Movimiento de Caja"
			size={425}
			classNames={{
				content: "bg-[#151515] border border-gray-800 text-white",
				header: "bg-[#151515] text-white",
				title: "text-white font-semibold",
				body: "pt-2",
			}}
		>
			<div className="grid gap-4 py-2">
				{!hasActiveShift && (
					<Text className="text-sm text-red-400">
						Debes abrir un turno antes de registrar movimientos.
					</Text>
				)}

				<div className="grid gap-2">
					<label htmlFor={movementTypeId} className="text-sm font-medium text-gray-300">
						Tipo de Movimiento
					</label>
					<NativeSelect
						id={movementTypeId}
						value={movementType}
						onChange={(event) =>
							setMovementType(event.target.value as CashMovementType)
						}
						data={[
							{ value: "inflow", label: "Ingreso (Entrada manual)" },
							{ value: "expense", label: "Gasto Operativo" },
							{ value: "payout", label: "Pago a Proveedor" },
						]}
						classNames={{
							input:
								"bg-[#0a0a0a] border-gray-800 text-white focus:border-[var(--color-voltage)]",
						}}
					/>
				</div>

				<div className="grid gap-2">
					<label htmlFor={movementAmountId} className="text-sm font-medium text-gray-300">
						Monto
					</label>
					<TextInput
						id={movementAmountId}
						type="number"
						placeholder="0"
						value={movementAmount}
						onChange={(event) => setMovementAmount(event.target.value)}
						classNames={{
							input:
								"bg-[#0a0a0a] border-gray-800 text-white focus:border-[var(--color-voltage)]",
						}}
					/>
				</div>

				<div className="grid gap-2">
					<label htmlFor={movementDescriptionId} className="text-sm font-medium text-gray-300">
						Descripción
					</label>
					<TextInput
						id={movementDescriptionId}
						placeholder="Ej. Pago de internet, Base adicional..."
						value={movementDescription}
						onChange={(event) => setMovementDescription(event.target.value)}
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
						disabled={!canRegister || isRegistering}
						className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]"
					>
						{isRegistering ? "Registrando..." : "Registrar Movimiento"}
					</Button>
				</Group>
			</div>
		</Modal>
	);
}
