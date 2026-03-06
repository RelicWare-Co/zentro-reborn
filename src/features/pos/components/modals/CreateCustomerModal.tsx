import { Button, Group, Modal, NativeSelect, Text, TextInput } from "@mantine/core";
import { useId } from "react";

interface CreateCustomerModalProps {
	isOpen: boolean;
	onClose: () => void;
	name: string;
	setName: (value: string) => void;
	phone: string;
	setPhone: (value: string) => void;
	documentType: string;
	setDocumentType: (value: string) => void;
	documentNumber: string;
	setDocumentNumber: (value: string) => void;
	canCreate: boolean;
	isCreating: boolean;
	error: Error | null;
	onConfirm: () => void;
}

export function CreateCustomerModal({
	isOpen,
	onClose,
	name,
	setName,
	phone,
	setPhone,
	documentType,
	setDocumentType,
	documentNumber,
	setDocumentNumber,
	canCreate,
	isCreating,
	error,
	onConfirm,
}: CreateCustomerModalProps) {
	const customerNameId = useId();
	const customerPhoneId = useId();
	const customerDocumentTypeId = useId();
	const customerDocumentNumberId = useId();

	return (
		<Modal
			opened={isOpen}
			onClose={onClose}
			title="Crear cliente rápido"
			size={450}
			classNames={{
				content: "bg-[#151515] border border-gray-800 text-white",
				header: "bg-[#151515] text-white",
				title: "text-white font-semibold",
				body: "pt-2",
			}}
		>
			<div className="space-y-4 py-2">
					<div className="grid gap-2">
						<label
							htmlFor={customerNameId}
							className="text-sm font-medium text-gray-300"
						>
							Nombre
						</label>
						<TextInput
							id={customerNameId}
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="Nombre del cliente"
							classNames={{
								input: "bg-[#0a0a0a] border-gray-800 text-white",
							}}
						/>
					</div>

					<div className="grid gap-2">
						<label
							htmlFor={customerPhoneId}
							className="text-sm font-medium text-gray-300"
						>
							Teléfono
						</label>
						<TextInput
							id={customerPhoneId}
							value={phone}
							onChange={(event) => setPhone(event.target.value)}
							placeholder="Opcional"
							classNames={{
								input: "bg-[#0a0a0a] border-gray-800 text-white",
							}}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="grid gap-2">
							<label
								htmlFor={customerDocumentTypeId}
								className="text-sm font-medium text-gray-300"
							>
								Tipo doc
							</label>
							<NativeSelect
								id={customerDocumentTypeId}
								value={documentType}
								onChange={(event) => setDocumentType(event.target.value)}
								data={[
									{ value: "CC", label: "CC" },
									{ value: "NIT", label: "NIT" },
									{ value: "CE", label: "CE" },
									{ value: "PAS", label: "Pasaporte" },
								]}
								classNames={{
									input:
										"h-10 border-gray-800 bg-[#0a0a0a] text-sm text-white focus:border-[var(--color-voltage)]",
								}}
							/>
						</div>

						<div className="grid gap-2">
							<label
								htmlFor={customerDocumentNumberId}
								className="text-sm font-medium text-gray-300"
							>
								Número doc
							</label>
							<TextInput
								id={customerDocumentNumberId}
								value={documentNumber}
								onChange={(event) => setDocumentNumber(event.target.value)}
								placeholder="Opcional"
								classNames={{
									input: "bg-[#0a0a0a] border-gray-800 text-white",
								}}
							/>
						</div>
					</div>

					{error instanceof Error && <Text className="text-sm text-red-400">{error.message}</Text>}

					<Group justify="flex-end" mt="md">
						<Button variant="subtle" color="gray" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						onClick={onConfirm}
						disabled={!canCreate || isCreating}
						className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]"
					>
						{isCreating ? "Creando..." : "Crear cliente"}
					</Button>
					</Group>
				</div>
		</Modal>
	);
}
