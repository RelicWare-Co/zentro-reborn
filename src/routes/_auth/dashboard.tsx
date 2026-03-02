import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/dashboard")({
	component: DashboardPage,
});

function DashboardPage() {
	return (
		<main className="flex-1 bg-[var(--color-void)] text-[var(--color-photon)] p-6 md:p-8 lg:p-12">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
				<p className="text-gray-400">
					Bienvenido a Zentro. Selecciona una opción del menú para comenzar.
				</p>
			</div>
		</main>
	);
}
