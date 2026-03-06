import { Button, Group, Modal, Text, Textarea, TextInput } from "@mantine/core";
import { useId } from "react";

interface OpenShiftModalProps {
	isOpen: boolean;
	onClose: () => void;
	startingCash: string;
	setStartingCash: (value: string) => void;
	openShiftNotes: string;
	setOpenShiftNotes: (value: string) => void;
	canOpenShift: boolean;
	isOpening: boolean;
	error: Error | null;
	onConfirm: () => void;
}

export function OpenShiftModal({
	isOpen,
	onClose,
	startingCash,
	setStartingCash,
	openShiftNotes,
	setOpenShiftNotes,
	canOpenShift,
	isOpening,
	error,
	onConfirm,
}: OpenShiftModalProps) {
	const startingCashId = useId();
	const openShiftNotesId = useId();

	return (
		<Modal
			opened={isOpen}
			onClose={onClose}
			title="Apertura de Turno"
			size={400}
			classNames={{
				content: "bg-[#151515] border border-gray-800 text-white",
				header: "bg-[#151515] text-white",
				title: "text-white font-semibold",
				body: "pt-2",
			}}
		>
			<div className="py-2">
				<Text className="text-sm text-gray-400 mb-4">
					Ingresa la base de efectivo inicial en la caja para comenzar a operar.
				</Text>

				<div className="grid gap-2">
					<label htmlFor={startingCashId} className="text-sm font-medium text-gray-300">
						Base en Efectivo
					</label>
					<TextInput
						id={startingCashId}
						type="number"
						placeholder="0"
						leftSection="$"
						value={startingCash}
						onChange={(event) => setStartingCash(event.target.value)}
						classNames={{
							input:
								"bg-[#0a0a0a] border-gray-800 text-white focus:border-[var(--color-voltage)] text-lg h-12",
							section: "text-gray-500",
						}}
					/>
				</div>

				<div className="grid gap-2 mt-4">
					<label htmlFor={openShiftNotesId} className="text-sm font-medium text-gray-300">
						Notas del turno
					</label>
					<Textarea
						id={openShiftNotesId}
						placeholder="Opcional: observaciones de apertura"
						value={openShiftNotes}
						onChange={(event) => setOpenShiftNotes(event.target.value)}
						minRows={3}
						classNames={{
							input:
								"bg-[#0a0a0a] border-gray-800 text-white focus:border-[var(--color-voltage)]",
						}}
					/>
				</div>

				{error instanceof Error && (
					<Text className="text-sm text-red-400 mt-3">{error.message}</Text>
				)}

				<Group justify="flex-end" mt="lg">
					<Button variant="subtle" color="gray" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						onClick={onConfirm}
						disabled={!canOpenShift || isOpening}
						className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]"
					>
						{isOpening ? "Abriendo..." : "Abrir Turno"}
					</Button>
				</Group>
			</div>
		</Modal>
	);
}
