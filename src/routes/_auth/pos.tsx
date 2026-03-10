import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { CartPanel } from "@/features/pos/components/CartPanel";
import { CashMovementModal } from "@/features/pos/components/modals/CashMovementModal";
import { CheckoutModal } from "@/features/pos/components/modals/CheckoutModal";
import { CloseShiftModal } from "@/features/pos/components/modals/CloseShiftModal";
import { CreateCustomerModal } from "@/features/pos/components/modals/CreateCustomerModal";
import { ModifierModal } from "@/features/pos/components/modals/ModifierModal";
import { OpenShiftModal } from "@/features/pos/components/modals/OpenShiftModal";
import { ShiftRequiredDialog } from "@/features/pos/components/modals/ShiftRequiredDialog";

import { PosHeader } from "@/features/pos/components/PosHeader";
import { ProductGrid } from "@/features/pos/components/ProductGrid";
import { useCreditAccounts, usePosCustomers, usePosProducts } from "@/features/pos/hooks";
import { useCreateCustomerModal } from "@/features/pos/hooks/useCreateCustomerModal";
import { useModifierModal } from "@/features/pos/hooks/useModifierModal";
import { usePosCart } from "@/features/pos/hooks/usePosCart";
import { usePosCheckout } from "@/features/pos/hooks/usePosCheckout";
import { usePosBootstrap } from "@/features/pos/hooks/usePosQueries";
import { usePosShift } from "@/features/pos/hooks/usePosShift";

import { getPosBootstrap } from "@/features/pos/pos.functions";

import type { Category, Product } from "@/features/pos/types";

export const Route = createFileRoute("/_auth/pos")({
	loader: () => getPosBootstrap(),
	component: PosPage,
});

function PosPage() {
	const bootstrapData = Route.useLoaderData();

	// Local state (declared before queries to avoid reference errors)
	const [activeCategoryId, setActiveCategoryId] = useState("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCustomerId, setSelectedCustomerId] = useState("");
	const [isShiftRequiredDialogOpen, setIsShiftRequiredDialogOpen] =
		useState(false);

	// Data queries
	const { data: bootstrap = bootstrapData } = usePosBootstrap(bootstrapData);
	const { data: productSearchResult, isFetching: isProductsFetching } =
		usePosProducts(activeCategoryId, searchQuery);
	const { data: customerSearchResult } = usePosCustomers();
	const { data: creditAccountsSearchResult } = useCreditAccounts();

	// Derived data
	const activeShift = bootstrap.activeShift;
	const categories = useMemo<Category[]>(
		() => [{ id: "all", name: "Todos" }, ...bootstrap.categories],
		[bootstrap.categories],
	);
	const filteredProducts = productSearchResult?.data ?? [];
	const modifierProducts = (bootstrap.modifierProducts ?? []) as Product[];
	const customers = customerSearchResult?.data ?? [];
	const creditAccounts = creditAccountsSearchResult?.data ?? [];
	const posSettings = bootstrap.settings;

	// Credit account lookup
	const creditAccountByCustomerId = useMemo(
		() =>
			new Map(
				creditAccounts.map((creditAccount) => [
					creditAccount.customerId,
					creditAccount,
				]),
			),
		[creditAccounts],
	);
	const selectedCustomerCreditAccount = selectedCustomerId
		? (creditAccountByCustomerId.get(selectedCustomerId) ?? null)
		: null;

	// Hooks
	const cart = usePosCart();
	const shift = usePosShift(activeShift);
	const checkout = usePosCheckout(
		activeShift?.id,
		cart.cart,
		cart.totals.totalAmount,
		selectedCustomerId,
		cart.discountInput,
		cart.clearCart,
		() => cart.setDiscountInput("0"),
		posSettings.paymentMethods,
		posSettings.allowCreditSales,
	);
	const modifierModal = useModifierModal(cart.addToCart, modifierProducts);
	const createCustomer = useCreateCustomerModal((customerId) => {
		setSelectedCustomerId(customerId);
	});

	// Computed values for checkout modal
	const projectedCreditBalance =
		(selectedCustomerCreditAccount?.balance ?? 0) + checkout.remainingCreditAmount;

	const handleOpenShift = useCallback(() => {
		shift.setStartingCash(String(posSettings.defaultStartingCash));
		shift.setIsShiftOpenModalOpen(true);
	}, [posSettings.defaultStartingCash, shift]);

	const handleCategoryChange = useCallback((categoryId: string) => {
		setActiveCategoryId(categoryId);
	}, []);

	const handleSearchChange = useCallback((query: string) => {
		setSearchQuery(query);
	}, []);

	const handleCustomerChange = useCallback((customerId: string) => {
		setSelectedCustomerId(customerId);
	}, []);

	const handleProductSelect = useCallback(
		(product: Product) => {
			if (!activeShift) {
				setIsShiftRequiredDialogOpen(true);
				return;
			}

			modifierModal.handleProductSelection(product);
		},
		[activeShift, modifierModal.handleProductSelection],
	);

	const handleOpenShiftFromDialog = useCallback(() => {
		setIsShiftRequiredDialogOpen(false);
		handleOpenShift();
	}, [handleOpenShift]);

	return (
		<div className="flex flex-col h-full w-full bg-[var(--color-void)] text-[var(--color-photon)] overflow-hidden">
			{/* Header */}
			<PosHeader
				activeShift={activeShift}
				defaultTerminalName={posSettings.defaultTerminalName}
				customers={customers}
				selectedCustomerId={selectedCustomerId}
				onCustomerChange={handleCustomerChange}
				onOpenShift={handleOpenShift}
				onCashMovement={() => shift.setIsCashMovementModalOpen(true)}
				onCloseShift={() => shift.setIsCloseShiftModalOpen(true)}
				onCreateCustomer={() => createCustomer.setIsCreateCustomerModalOpen(true)}
			/>

			{/* Main Content */}
			<div className="flex flex-1 min-h-0">
				<ProductGrid
					categories={categories}
					activeCategoryId={activeCategoryId}
					searchQuery={searchQuery}
					products={filteredProducts}
					isLoading={isProductsFetching}
					isActiveShift={Boolean(activeShift)}
					getProductQuantity={cart.getProductQuantity}
					onCategoryChange={handleCategoryChange}
					onSearchChange={handleSearchChange}
					onProductSelect={handleProductSelect}
				/>

				<CartPanel
					cart={cart.cart}
					totalItems={cart.totalItems}
					totals={cart.totals}
					isActiveShift={Boolean(activeShift)}
					onUpdateQuantity={cart.updateQuantity}
					onRemoveItem={cart.removeFromCart}
					onUpdateItemDiscount={cart.updateItemDiscount}
					onClearCart={cart.clearCart}
					onCheckout={() => checkout.setIsCheckoutModalOpen(true)}
				/>
			</div>

			{/* Modals */}
			<OpenShiftModal
				isOpen={shift.isShiftOpenModalOpen}
				onClose={() => shift.setIsShiftOpenModalOpen(false)}
				startingCash={shift.startingCash}
				setStartingCash={shift.setStartingCash}
				openShiftNotes={shift.openShiftNotes}
				setOpenShiftNotes={shift.setOpenShiftNotes}
				canOpenShift={shift.canOpenShift}
				isOpening={shift.isOpeningShift}
				error={shift.openShiftError}
				onConfirm={shift.handleOpenShift}
			/>

			<CashMovementModal
				isOpen={shift.isCashMovementModalOpen}
				onClose={() => shift.setIsCashMovementModalOpen(false)}
				movementType={shift.movementType}
				setMovementType={shift.setMovementType}
				movementAmount={shift.movementAmount}
				setMovementAmount={shift.setMovementAmount}
				movementDescription={shift.movementDescription}
				setMovementDescription={shift.setMovementDescription}
				canRegister={shift.canRegisterCashMovement}
				isRegistering={shift.isRegisteringMovement}
				hasActiveShift={Boolean(activeShift)}
				error={shift.cashMovementError}
				onConfirm={shift.handleCashMovement}
			/>

			<CloseShiftModal
				isOpen={shift.isCloseShiftModalOpen}
				onClose={() => shift.setIsCloseShiftModalOpen(false)}
				activeShift={activeShift}
				shiftCloseSummary={shift.shiftCloseSummary}
				isLoading={shift.isShiftSummaryFetching}
				closureAmounts={shift.closureAmounts}
				setClosureAmounts={shift.setClosureAmounts}
				closeShiftNotes={shift.closeShiftNotes}
				setCloseShiftNotes={shift.setCloseShiftNotes}
				hasInvalidAmounts={shift.hasInvalidCloseAmounts}
				isClosing={shift.isClosingShift}
				error={shift.closeShiftError}
				onConfirm={shift.handleCloseShift}
			/>

			<ModifierModal
				isOpen={modifierModal.isModifierModalOpen}
				onClose={modifierModal.handleCloseModal}
				selectedProduct={modifierModal.selectedProductForModifiers}
				modifierProducts={modifierProducts}
				modifierQuantities={modifierModal.modifierQuantities}
				onUpdateModifierQuantity={modifierModal.updateModifierQuantity}
				onConfirm={modifierModal.handleConfirmModifiers}
				onQuickAdd={modifierModal.handleQuickAddWithoutModifiers}
			/>

			<CreateCustomerModal
				isOpen={createCustomer.isCreateCustomerModalOpen}
				onClose={() => createCustomer.setIsCreateCustomerModalOpen(false)}
				name={createCustomer.newCustomerName}
				setName={createCustomer.setNewCustomerName}
				phone={createCustomer.newCustomerPhone}
				setPhone={createCustomer.setNewCustomerPhone}
				documentType={createCustomer.newCustomerDocumentType}
				setDocumentType={createCustomer.setNewCustomerDocumentType}
				documentNumber={createCustomer.newCustomerDocumentNumber}
				setDocumentNumber={createCustomer.setNewCustomerDocumentNumber}
				canCreate={createCustomer.canCreateCustomer}
				isCreating={createCustomer.isCreating}
				error={createCustomer.error}
				onConfirm={createCustomer.handleCreateCustomer}
			/>

			<ShiftRequiredDialog
				isOpen={isShiftRequiredDialogOpen}
				onClose={() => setIsShiftRequiredDialogOpen(false)}
				onOpenShift={handleOpenShiftFromDialog}
			/>

			<CheckoutModal
				isOpen={checkout.isCheckoutModalOpen}
				onClose={() => checkout.setIsCheckoutModalOpen(false)}
				totalAmount={cart.totals.totalAmount}
				discountInput={cart.discountInput}
				setDiscountInput={cart.setDiscountInput}
				payments={checkout.payments}
				paymentMethodOptions={posSettings.paymentMethods}
				allowCreditSales={posSettings.allowCreditSales}
				isCreditSale={checkout.isCreditSale}
				setIsCreditSale={checkout.setIsCreditSale}
				selectedCustomerId={selectedCustomerId}
				selectedCustomerCreditAccount={selectedCustomerCreditAccount}
				projectedCreditBalance={projectedCreditBalance}
				remainingCreditAmount={checkout.remainingCreditAmount}
				shouldCreateCreditBalance={checkout.shouldCreateCreditBalance}
				canFinalize={checkout.canFinalizeSale}
				isProcessing={checkout.isProcessing}
				paymentDifference={checkout.paymentDifference}
				hasPaymentDifference={checkout.hasPaymentDifference}
				error={checkout.error}
				onAddPaymentMethod={checkout.addPaymentMethod}
				onRemovePaymentMethod={checkout.removePaymentMethod}
				onUpdatePayment={checkout.updatePayment}
				onConfirm={checkout.handleFinalizeSale}
			/>
		</div>
	);
}
