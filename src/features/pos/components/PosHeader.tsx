import { Button, Divider, NativeSelect } from "@mantine/core";
import { ArrowLeftRight, Lock, Plus, Users } from "lucide-react";
import type { ActiveShift, PosCustomer } from "../types";

interface PosHeaderProps {
	activeShift: ActiveShift | null;
	customers: PosCustomer[];
	selectedCustomerId: string;
	onCustomerChange: (customerId: string) => void;
	onOpenShift: () => void;
	onCashMovement: () => void;
	onCloseShift: () => void;
	onCreateCustomer: () => void;
}

export function PosHeader({
	activeShift,
	customers,
	selectedCustomerId,
	onCustomerChange,
	onOpenShift,
	onCashMovement,
	onCloseShift,
	onCreateCustomer,
}: PosHeaderProps) {
	return (
		<header className="h-14 border-b border-gray-800 flex items-center justify-between px-4 shrink-0 bg-[var(--color-carbon)] z-10">
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-2 text-sm">
					<span
						className={`w-2.5 h-2.5 rounded-full ${
							activeShift
								? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
								: "bg-gray-500"
						}`}
					/>
					<span className="font-semibold text-white">
						{activeShift?.terminalName || "Caja Principal"}
					</span>
					<span className="text-gray-400 text-xs px-1.5 py-0.5 bg-gray-800 rounded-md">
						{activeShift ? "Abierta" : "Cerrada"}
					</span>
				</div>

				<Divider orientation="vertical" className="h-5 border-gray-700" />

				<div className="flex items-center gap-2 bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-800 focus-within:border-gray-600 transition-colors">
					<Users className="w-4 h-4 text-gray-400" />
					<NativeSelect
						value={selectedCustomerId}
						onChange={(event) => onCustomerChange(event.target.value)}
						data={[
							{ value: "", label: "Cliente Mostrador" },
							...customers.map((customer) => ({
								value: customer.id,
								label: customer.name,
							})),
						]}
						classNames={{
							input:
								"bg-transparent text-sm text-white border-none cursor-pointer min-w-[150px] h-7 pl-0",
						}}
						aria-label="Seleccionar cliente"
					/>
					<Button
						type="button"
						variant="subtle"
						size="compact-sm"
						onClick={onCreateCustomer}
						className="h-7 px-2 text-xs text-[var(--color-voltage)] hover:text-[var(--color-voltage)] hover:bg-[var(--color-voltage)]/10"
					>
						<Plus className="w-3.5 h-3.5 mr-1" />
						Cliente
					</Button>
				</div>
			</div>

			<div className="flex items-center gap-2">
				{!activeShift && (
					<Button
						variant="outline"
						size="compact-sm"
						onClick={onOpenShift}
						className="h-9 border-[var(--color-voltage)]/40 bg-[var(--color-voltage)]/10 text-[var(--color-voltage)] hover:bg-[var(--color-voltage)]/20 transition-all"
					>
						Abrir Turno
					</Button>
				)}
				<Button
					variant="outline"
					size="compact-sm"
					onClick={onCashMovement}
					disabled={!activeShift}
					className="h-9 border-gray-700 bg-gray-900/50 text-gray-300 hover:text-white hover:bg-gray-800 hover:border-gray-600 transition-all"
				>
					<ArrowLeftRight className="w-4 h-4 mr-2" />
					Movimiento de Caja
				</Button>
				<Button
					variant="outline"
					size="compact-sm"
					onClick={onCloseShift}
					disabled={!activeShift}
					className="h-9 border-red-900/30 bg-red-900/10 text-red-400 hover:text-red-300 hover:bg-red-900/30 hover:border-red-900/50 transition-all"
				>
					<Lock className="w-4 h-4 mr-2" />
					Cerrar Turno
				</Button>
			</div>
		</header>
	);
}
