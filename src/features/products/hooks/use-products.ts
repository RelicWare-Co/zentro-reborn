import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createCategory,
	createProduct,
	deleteCategory,
	deleteProduct,
	getCategories,
	getProducts,
	registerInventoryMovement,
	updateCategory,
	updateProduct,
} from "@/features/products/products.functions";

export type Product = Awaited<ReturnType<typeof getProducts>>[number];
export type Category = Awaited<ReturnType<typeof getCategories>>[number];
type CreateProductResult = Awaited<ReturnType<typeof createProduct>>;
type UpdateProductResult = Awaited<ReturnType<typeof updateProduct>>;
type DeleteProductResult = Awaited<ReturnType<typeof deleteProduct>>;
type CreateCategoryResult = Awaited<ReturnType<typeof createCategory>>;
type UpdateCategoryResult = Awaited<ReturnType<typeof updateCategory>>;
type DeleteCategoryResult = Awaited<ReturnType<typeof deleteCategory>>;
type RegisterInventoryMovementResult = Awaited<
	ReturnType<typeof registerInventoryMovement>
>;

export const PRODUCT_QUERY_KEY = ["products"];
export const CATEGORY_QUERY_KEY = ["product-categories"];

type ProductsMutationsOptions = {
	onCreateProductSuccess?: (data: CreateProductResult) => void;
	onUpdateProductSuccess?: (data: UpdateProductResult) => void;
	onDeleteProductSuccess?: (data: DeleteProductResult) => void;
	onCreateCategorySuccess?: (data: CreateCategoryResult) => void;
	onUpdateCategorySuccess?: (data: UpdateCategoryResult) => void;
	onDeleteCategorySuccess?: (data: DeleteCategoryResult) => void;
	onRegisterInventoryMovementSuccess?: (
		data: RegisterInventoryMovementResult,
	) => void;
};

export function useProductsQueries(initialProducts?: Product[]) {
	const { data: products = initialProducts ?? [] } = useQuery({
		queryKey: PRODUCT_QUERY_KEY,
		queryFn: () => getProducts(),
		initialData: initialProducts,
	});

	const { data: categories = [] } = useQuery({
		queryKey: CATEGORY_QUERY_KEY,
		queryFn: () => getCategories(),
	});

	return { products, categories };
}

export function useProductsMutations(options?: ProductsMutationsOptions) {
	const queryClient = useQueryClient();

	const invalidateProducts = async () => {
		await queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY });
	};

	const invalidateProductsAndCategories = async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY }),
			queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY }),
		]);
	};

	const createProductMutation = useMutation({
		mutationFn: (payload: {
			name: string;
			categoryId: string | null;
			sku: string | null;
			barcode: string | null;
			price: number;
			cost: number;
			taxRate: number;
			stock: number;
			trackInventory: boolean;
			isModifier: boolean;
		}) => createProduct({ data: payload }),
		onSuccess: async (data) => {
			options?.onCreateProductSuccess?.(data);
			await invalidateProducts();
		},
	});

	const updateProductMutation = useMutation({
		mutationFn: (payload: {
			id: string;
			name: string;
			categoryId: string | null;
			sku: string | null;
			barcode: string | null;
			price: number;
			cost: number;
			taxRate: number;
			stock: number;
			trackInventory: boolean;
			isModifier: boolean;
		}) => updateProduct({ data: payload }),
		onSuccess: async (data) => {
			options?.onUpdateProductSuccess?.(data);
			await invalidateProducts();
		},
	});

	const deleteProductMutation = useMutation({
		mutationFn: (id: string) => deleteProduct({ data: { id } }),
		onSuccess: async (data) => {
			options?.onDeleteProductSuccess?.(data);
			await invalidateProducts();
		},
	});

	const createCategoryMutation = useMutation({
		mutationFn: (payload: { name: string; description: string | null }) =>
			createCategory({ data: payload }),
		onSuccess: async (data) => {
			options?.onCreateCategorySuccess?.(data);
			await invalidateProductsAndCategories();
		},
	});

	const updateCategoryMutation = useMutation({
		mutationFn: (payload: {
			id: string;
			name?: string;
			description?: string | null;
		}) => updateCategory({ data: payload }),
		onSuccess: async (data) => {
			options?.onUpdateCategorySuccess?.(data);
			await invalidateProductsAndCategories();
		},
	});

	const deleteCategoryMutation = useMutation({
		mutationFn: (id: string) => deleteCategory({ data: { id } }),
		onSuccess: async (data) => {
			options?.onDeleteCategorySuccess?.(data);
			await invalidateProductsAndCategories();
		},
	});

	const registerInventoryMovementMutation = useMutation({
		mutationFn: (payload: {
			productId: string;
			type: "restock" | "waste" | "adjustment";
			quantity: number;
			restockMode?: "add_to_stock" | "set_as_total";
			notes: string | null;
		}) => registerInventoryMovement({ data: payload }),
		onSuccess: async (data) => {
			options?.onRegisterInventoryMovementSuccess?.(data);
			await invalidateProducts();
		},
	});

	return {
		createProductMutation,
		updateProductMutation,
		deleteProductMutation,
		createCategoryMutation,
		updateCategoryMutation,
		deleteCategoryMutation,
		registerInventoryMovementMutation,
	};
}
