import { Button, Group, Modal, Text } from "@mantine/core";
import { Minus, Plus } from "lucide-react";
import type { Product } from "../../types";
import { formatCurrency } from "../../utils";

interface ModifierModalProps {
	isOpen: boolean;
	onClose: () => void;
	selectedProduct: Product | null;
	modifierProducts: Product[];
	modifierQuantities: Record<string, number>;
	onUpdateModifierQuantity: (modifierId: string, delta: number) => void;
	onConfirm: () => void;
	onQuickAdd: () => void;
}

export function ModifierModal({
	isOpen,
	onClose,
	selectedProduct,
	modifierProducts,
	modifierQuantities,
	onUpdateModifierQuantity,
	onConfirm,
	onQuickAdd,
}: ModifierModalProps) {
	return (
		<Modal
			opened={isOpen}
			onClose={onClose}
			title={`Añadir modificadores · ${selectedProduct?.name ?? ""}`}
			size={500}
			classNames={{
				content: "bg-[#151515] border border-gray-800 text-white",
				header: "bg-[#151515] text-white",
				title: "text-white font-semibold",
				body: "pt-2",
			}}
		>
			<div className="space-y-3 py-2">
				{modifierProducts.length === 0 ? (
					<Text className="text-sm text-gray-400">
						No hay modificadores configurados para este negocio.
					</Text>
				) : (
					modifierProducts.map((modifierProduct) => (
						<div
							key={modifierProduct.id}
							className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0a0a0a] p-3"
						>
							<div>
								<p className="text-sm font-medium text-white">
									{modifierProduct.name}
								</p>
								<p className="text-xs text-gray-400">
									{formatCurrency(modifierProduct.price)} c/u
								</p>
							</div>
							<div className="flex items-center bg-black/50 rounded-md border border-gray-800/80">
								<button
									type="button"
									onClick={() =>
										onUpdateModifierQuantity(modifierProduct.id, -1)
									}
									className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-l-md transition-colors"
								>
									<Minus className="h-3 w-3" />
								</button>
								<div className="w-9 text-center text-sm font-semibold text-white">
									{modifierQuantities[modifierProduct.id] ?? 0}
								</div>
								<button
									type="button"
									onClick={() =>
										onUpdateModifierQuantity(modifierProduct.id, 1)
									}
									className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-r-md transition-colors"
								>
									<Plus className="h-3 w-3" />
								</button>
							</div>
						</div>
					))
				)}
			</div>

			<Group justify="flex-end" mt="md">
				<Button variant="subtle" color="gray" onClick={onQuickAdd}>
					Agregar sin modificadores
				</Button>
				<Button
					onClick={onConfirm}
					className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]"
				>
					Confirmar selección
				</Button>
			</Group>
		</Modal>
	);
}
