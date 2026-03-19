import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteProductDialogProps {
	productId: string | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	isPending: boolean;
}

export function DeleteProductDialog({
	productId,
	onOpenChange,
	onConfirm,
	isPending,
}: DeleteProductDialogProps) {
	return (
		<AlertDialog open={productId !== null} onOpenChange={onOpenChange}>
			<AlertDialogContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
				<AlertDialogHeader>
					<AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
					<AlertDialogDescription className="text-gray-400">
						Esta acción no se puede deshacer. El producto será marcado como
						eliminado y removido del inventario activo.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel className="bg-transparent border-gray-700 text-gray-300 hover:bg-white/5 hover:text-white">
						Cancelar
					</AlertDialogCancel>
					<AlertDialogAction
						className="bg-red-500 hover:bg-red-600 text-white border-none"
						onClick={onConfirm}
						disabled={isPending}
					>
						{isPending ? "Eliminando..." : "Eliminar"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
