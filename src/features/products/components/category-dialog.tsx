import { Trash2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/features/products/hooks/use-products";
import { useProductsMutations } from "@/features/products/hooks/use-products";

interface CategoryDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedCategory: Category | null;
}

export function CategoryDialog({
	open,
	onOpenChange,
	selectedCategory,
}: CategoryDialogProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");

	const nameId = useId();
	const descriptionId = useId();

	useEffect(() => {
		if (!open) {
			return;
		}

		setName(selectedCategory?.name ?? "");
		setDescription(selectedCategory?.description ?? "");
	}, [open, selectedCategory]);

	const closeDialog = () => {
		onOpenChange(false);
	};

	const {
		createCategoryMutation,
		updateCategoryMutation,
		deleteCategoryMutation,
	} = useProductsMutations({
		onCreateCategorySuccess: closeDialog,
		onUpdateCategorySuccess: closeDialog,
		onDeleteCategorySuccess: closeDialog,
	});

	const handleCreateCategory = async () => {
		await createCategoryMutation.mutateAsync({
			name,
			description: description || null,
		});
	};

	const handleUpdateCategory = async () => {
		if (!selectedCategory) {
			return;
		}

		await updateCategoryMutation.mutateAsync({
			id: selectedCategory.id,
			name,
			description: description || null,
		});
	};

	const handleDeleteCategory = async () => {
		if (!selectedCategory) {
			return;
		}

		await deleteCategoryMutation.mutateAsync(selectedCategory.id);
	};

	const errorMessage =
		createCategoryMutation.error instanceof Error
			? createCategoryMutation.error.message
			: updateCategoryMutation.error instanceof Error
				? updateCategoryMutation.error.message
				: deleteCategoryMutation.error instanceof Error
					? deleteCategoryMutation.error.message
					: null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="bg-[var(--color-carbon)] border-gray-800 text-white sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle>
						{selectedCategory ? "Editar Categoría" : "Crear Categoría"}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="grid gap-2">
						<Label htmlFor={nameId}>Nombre</Label>
						<Input
							id={nameId}
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="Nombre de la categoría"
							className="bg-black/20 border-gray-700"
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor={descriptionId}>Descripción</Label>
						<Textarea
							id={descriptionId}
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							placeholder="Opcional"
							className="min-h-[72px] bg-black/20 border-gray-700"
						/>
					</div>
					{errorMessage && (
						<p className="text-sm text-red-400">{errorMessage}</p>
					)}
				</div>
				<DialogFooter className="gap-2 sm:justify-between">
					{selectedCategory ? (
						<Button
							variant="outline"
							onClick={handleDeleteCategory}
							disabled={deleteCategoryMutation.isPending}
							className="border-red-900/40 text-red-400 hover:bg-red-900/20"
						>
							<Trash2 className="w-4 h-4 mr-2" />
							Eliminar
						</Button>
					) : (
						<span />
					)}
					<div className="flex gap-2">
						<Button variant="ghost" onClick={closeDialog}>
							Cancelar
						</Button>
						<Button
							onClick={
								selectedCategory ? handleUpdateCategory : handleCreateCategory
							}
							disabled={
								!name.trim() ||
								createCategoryMutation.isPending ||
								updateCategoryMutation.isPending
							}
							className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]"
						>
							{selectedCategory ? "Save" : "Create"}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
