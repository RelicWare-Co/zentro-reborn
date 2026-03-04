import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="bg-[#151515] border-gray-800 text-white sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Movimiento de Caja</DialogTitle>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					{!hasActiveShift && (
						<p className="text-sm text-red-400">
							Debes abrir un turno antes de registrar movimientos.
						</p>
					)}

					<div className="grid gap-2">
						<label
							htmlFor={movementTypeId}
							className="text-sm font-medium text-gray-300"
						>
							Tipo de Movimiento
						</label>
						<select
							id={movementTypeId}
							value={movementType}
							onChange={(e) => setMovementType(e.target.value as CashMovementType)}
							className="flex h-10 w-full rounded-md border border-gray-800 bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-voltage)] focus:border-transparent"
						>
							<option value="inflow">Ingreso (Entrada manual)</option>
							<option value="expense">Gasto Operativo</option>
							<option value="payout">Pago a Proveedor</option>
						</select>
					</div>

					<div className="grid gap-2">
						<label
							htmlFor={movementAmountId}
							className="text-sm font-medium text-gray-300"
						>
							Monto
						</label>
						<Input
							id={movementAmountId}
							type="number"
							placeholder="0"
							value={movementAmount}
							onChange={(e) => setMovementAmount(e.target.value)}
							className="bg-[#0a0a0a] border-gray-800 text-white focus-visible:ring-[var(--color-voltage)]"
						/>
					</div>

					<div className="grid gap-2">
						<label
							htmlFor={movementDescriptionId}
							className="text-sm font-medium text-gray-300"
						>
							Descripción
						</label>
						<Input
							id={movementDescriptionId}
							placeholder="Ej. Pago de internet, Base adicional..."
							value={movementDescription}
							onChange={(e) => setMovementDescription(e.target.value)}
							className="bg-[#0a0a0a] border-gray-800 text-white focus-visible:ring-[var(--color-voltage)]"
						/>
					</div>

					{error instanceof Error && (
						<p className="text-sm text-red-400">{error.message}</p>
					)}
				</div>

				<DialogFooter>
					<Button
						variant="ghost"
						onClick={onClose}
						className="text-gray-400 hover:text-white hover:bg-gray-800"
					>
						Cancelar
					</Button>
					<Button
						onClick={onConfirm}
						disabled={!canRegister || isRegistering}
						className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]"
					>
						{isRegistering ? "Registrando..." : "Registrar Movimiento"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
