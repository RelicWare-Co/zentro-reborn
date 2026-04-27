import { createFileRoute } from "@tanstack/react-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	useKitchenBoard,
	useUpdateRestaurantOrderItemStatusMutation,
} from "@/features/restaurants/hooks/use-restaurants";
import { getKitchenBoard } from "@/features/restaurants/restaurants.functions";

export const Route = createFileRoute("/_auth/kitchen")({
	loader: () => getKitchenBoard(),
	component: KitchenPage,
});

function KitchenPage() {
	const loaderData = Route.useLoaderData();
	const { data = loaderData } = useKitchenBoard(loaderData);
	const updateStatusMutation = useUpdateRestaurantOrderItemStatusMutation();

	return (
		<main className="flex-1 min-h-0 overflow-y-auto bg-[var(--color-void)] p-6 text-[var(--color-photon)] md:p-8">
			<div className="mb-6">
				<h1 className="text-2xl font-semibold">Cocina</h1>
				<p className="mt-1 text-sm text-gray-400">
					Comandas pendientes y listas para despacho.
				</p>
			</div>

			{data.tickets.length === 0 ? (
				<Alert className="border-gray-700 bg-[var(--color-carbon)] text-[var(--color-photon)]">
					<AlertTitle>Sin comandas</AlertTitle>
					<AlertDescription>
						No hay tickets pendientes en este momento.
					</AlertDescription>
				</Alert>
			) : (
				<div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
					{data.tickets.map((ticket) => (
						<Card
							key={ticket.id}
							className="border-gray-800 bg-[var(--color-carbon)] shadow-none"
						>
							<CardHeader className="border-b border-gray-800 pb-4">
								<CardTitle className="text-base">
									Orden #{ticket.orderNumber} · {ticket.table.name}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3 pt-5">
								<div className="text-sm text-gray-400">
									{ticket.table.areaName} · Ticket {ticket.sequenceNumber}
								</div>
								{ticket.items.map((item) => (
									<div
										key={item.id}
										className="rounded-lg border border-gray-800 bg-black/10 p-3"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<div className="truncate font-medium">
													{item.quantity} × {item.productName}
												</div>
												{item.notes ? (
													<div className="mt-1 text-sm text-gray-400">
														{item.notes}
													</div>
												) : null}
											</div>
											<div className="text-xs text-gray-400">
												{item.status === "ready" ? "Listo" : "En preparación"}
											</div>
										</div>
										<div className="mt-3 flex gap-2">
											{item.status === "sent" ? (
												<Button
													type="button"
													variant="outline"
													onClick={() =>
														updateStatusMutation.mutate({
															orderItemId: item.id,
															status: "ready",
														})
													}
													disabled={updateStatusMutation.isPending}
													className="border-gray-700 bg-transparent text-gray-100 hover:bg-white/5"
												>
													Marcar Listo
												</Button>
											) : null}
											<Button
												type="button"
												variant="outline"
												onClick={() =>
													updateStatusMutation.mutate({
														orderItemId: item.id,
														status: "served",
													})
												}
												disabled={updateStatusMutation.isPending}
												className="border-gray-700 bg-transparent text-gray-100 hover:bg-white/5"
											>
												Despachar
											</Button>
										</div>
									</div>
								))}
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</main>
	);
}
