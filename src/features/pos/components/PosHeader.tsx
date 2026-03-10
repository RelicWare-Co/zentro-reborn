import { useMemo, useState } from "react";
import {
	ArrowLeftRight,
	Check,
	ChevronsUpDown,
	Lock,
	Plus,
	Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
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
	const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);
	const selectedCustomer = useMemo(
		() => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
		[customers, selectedCustomerId],
	);
	const selectedCustomerLabel = selectedCustomer?.name ?? "Cliente Mostrador";
	const selectedCustomerMeta = selectedCustomer
		? [selectedCustomer.documentNumber, selectedCustomer.phone]
				.filter(Boolean)
				.join(" · ")
		: "Venta rápida sin cliente asociado";

	return (
		<header className="border-b border-gray-800 px-4 py-2 shrink-0 bg-[var(--color-carbon)] z-10">
			<div className="flex min-h-10 flex-wrap items-center justify-between gap-3">
				<div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
					<div className="flex shrink-0 items-center gap-2 text-sm whitespace-nowrap">
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

					<Separator
						orientation="vertical"
						className="hidden h-5 border-gray-700 lg:block"
					/>

					<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-1.5 transition-colors focus-within:border-[var(--color-voltage)] focus-within:ring-1 focus-within:ring-[var(--color-voltage)]/20">
						<Users className="h-4 w-4 shrink-0 text-gray-400" />
						<Popover
							open={isCustomerPickerOpen}
							onOpenChange={setIsCustomerPickerOpen}
						>
							<PopoverTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									role="combobox"
									aria-expanded={isCustomerPickerOpen}
									className="h-auto min-h-7 min-w-[180px] flex-1 justify-between px-0 py-0 text-left text-sm text-white hover:bg-transparent hover:text-white"
								>
									<span className="min-w-0">
										<span className="block truncate">{selectedCustomerLabel}</span>
										<span className="block truncate text-xs text-gray-500">
											{selectedCustomerMeta}
										</span>
									</span>
									<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-500" />
								</Button>
							</PopoverTrigger>
							<PopoverContent
								align="start"
								className="w-[320px] border-gray-800 bg-[var(--color-carbon)] p-0 text-white"
							>
								<Command className="bg-transparent">
									<CommandInput
										placeholder="Buscar por nombre, documento o teléfono..."
										className="text-white placeholder:text-gray-500"
									/>
									<CommandList className="p-1.5">
										<CommandEmpty className="text-gray-400">
											No se encontraron clientes.
										</CommandEmpty>
										<CommandItem
											value="mostrador cliente mostrador venta rápida"
											onSelect={() => {
												onCustomerChange("");
												setIsCustomerPickerOpen(false);
											}}
											className="gap-3 rounded-lg py-3 text-white"
										>
											<div className="min-w-0 flex-1 space-y-1">
												<p className="truncate font-medium">Cliente Mostrador</p>
												<p className="truncate text-xs text-gray-400">
													Venta rápida sin cliente asociado
												</p>
											</div>
											<Check
												className={`h-4 w-4 shrink-0 ${
													selectedCustomerId === "" ? "opacity-100" : "opacity-0"
												}`}
											/>
										</CommandItem>
										{customers.map((customer) => (
											<CommandItem
												key={customer.id}
												value={`${customer.name} ${customer.documentNumber ?? ""} ${customer.phone ?? ""} ${customer.email ?? ""}`}
												onSelect={() => {
													onCustomerChange(customer.id);
													setIsCustomerPickerOpen(false);
												}}
												className="gap-3 rounded-lg py-3 text-white"
											>
												<div className="min-w-0 flex-1 space-y-1">
													<p className="truncate font-medium">{customer.name}</p>
													<p className="truncate text-xs text-gray-400">
														{[
															customer.documentNumber,
															customer.phone,
															customer.email,
														]
															.filter(Boolean)
															.join(" · ") || "Sin datos adicionales"}
													</p>
												</div>
												<Check
													className={`h-4 w-4 shrink-0 ${
														selectedCustomerId === customer.id
															? "opacity-100"
															: "opacity-0"
													}`}
												/>
											</CommandItem>
										))}
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={onCreateCustomer}
							className="h-7 shrink-0 px-2 text-xs text-[var(--color-voltage)] hover:text-[var(--color-voltage)] hover:bg-[var(--color-voltage)]/10"
						>
							<Plus className="mr-1 h-3.5 w-3.5" />
							Cliente
						</Button>
					</div>
				</div>

				<div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
					{!activeShift && (
						<Button
							variant="outline"
							size="sm"
							onClick={onOpenShift}
							className="h-9 whitespace-nowrap border-[var(--color-voltage)]/40 bg-[var(--color-voltage)]/10 text-[var(--color-voltage)] hover:bg-[var(--color-voltage)]/20 transition-all"
						>
							Abrir Turno
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={onCashMovement}
						disabled={!activeShift}
						className="h-9 whitespace-nowrap border-gray-700 bg-gray-900/50 text-gray-300 hover:text-white hover:bg-gray-800 hover:border-gray-600 transition-all"
					>
						<ArrowLeftRight className="mr-2 h-4 w-4" />
						Movimiento de Caja
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={onCloseShift}
						disabled={!activeShift}
						className="h-9 whitespace-nowrap border-red-900/30 bg-red-900/10 text-red-400 hover:text-red-300 hover:bg-red-900/30 hover:border-red-900/50 transition-all"
					>
						<Lock className="mr-2 h-4 w-4" />
						Cerrar Turno
					</Button>
				</div>
			</div>
		</header>
	);
}
