import type { searchCreditAccounts } from "@/features/credit/credit.functions";
import type {
	getPosBootstrap,
	getSaleById,
	getShiftCloseSummary,
	listSales,
	searchPosCustomers,
	searchPosProducts,
} from "./pos.functions";

// Producto retornado por la búsqueda POS
export type Product = Awaited<
	ReturnType<typeof searchPosProducts>
>["data"][number];

// Cliente retornado por la búsqueda POS
export type PosCustomer = Awaited<
	ReturnType<typeof searchPosCustomers>
>["data"][number];

// Cuenta de crédito retornada por la búsqueda
export type CreditAccount = Awaited<
	ReturnType<typeof searchCreditAccounts>
>["data"][number];

// Datos del bootstrap del POS
export type PosBootstrap = Awaited<ReturnType<typeof getPosBootstrap>>;

// Turno activo
export type ActiveShift = PosBootstrap["activeShift"];

// Resumen de cierre de turno
export type ShiftCloseSummary = Awaited<
	ReturnType<typeof getShiftCloseSummary>
>;

// Resultado del historial de ventas
export type SaleListResult = Awaited<ReturnType<typeof listSales>>;

// Item resumido del historial de ventas
export type SaleListItem = SaleListResult["data"][number];

// Detalle de una venta
export type SaleDetail = Awaited<ReturnType<typeof getSaleById>>;

// Categoría de productos
export type Category = {
	id: string;
	name: string;
};

// Modificador de un item en el carrito
export type CartItemModifier = {
	id: string;
	name: string;
	price: number;
	quantity: number;
};

// Item en el carrito
export type CartItem = {
	id: string; // ID único para permitir múltiples productos iguales con diferentes modificadores
	product: Product;
	quantity: number;
	modifiers: CartItemModifier[];
	discountAmount: number;
};

// Método de pago
export type PaymentMethod = {
	id: string;
	method: string;
	amount: string;
	reference: string;
};

// Tipo de movimiento de caja
export type CashMovementType = "expense" | "payout" | "inflow";

// Estado del carrito
export type CartState = {
	items: CartItem[];
	discountInput: string;
};

// Totales calculados del carrito
export type CartTotals = {
	subTotal: number;
	tax: number;
	saleDiscountAmount: number;
	itemsDiscountAmount: number;
	discountAmount: number;
	totalAmount: number;
};

// Props comunes para modales
export type ModalProps = {
	isOpen: boolean;
	onClose: () => void;
};
