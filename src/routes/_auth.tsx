import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { getIsAuthenticated } from "@/features/auth/auth.functions";

export const Route = createFileRoute("/_auth")({
	beforeLoad: async () => {
		const isAuthenticated = await getIsAuthenticated();
		if (!isAuthenticated) {
			throw redirect({ to: "/login" });
		}
	},
	component: AuthLayout,
});

function AuthLayout() {
	return (
		<AppLayout>
			<Outlet />
		</AppLayout>
	);
}
