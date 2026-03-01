import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
	Building2,
	ChevronLeft,
	ChevronRight,
	LayoutDashboard,
	Loader2,
	LogOut,
	Menu,
	Package,
	Settings,
	Store,
} from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { OrganizationSelection } from "./OrganizationSelection";

export function AppLayout({ children }: { children: React.ReactNode }) {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const location = useLocation();
	const navigate = useNavigate();

	const { data: activeOrganization, isPending: isActiveOrgPending } =
		authClient.useActiveOrganization();

	const navItems = [
		{ name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
		{ name: "POS", path: "/pos", icon: Store },
		{ name: "Productos", path: "/products", icon: Package },
		{ name: "Configuración", path: "/settings", icon: Settings },
	];

	if (isActiveOrgPending) {
		return (
			<div className="flex h-screen w-full items-center justify-center bg-[var(--color-void)] text-[var(--color-photon)]">
				<Loader2 className="h-8 w-8 animate-spin text-[var(--color-voltage)]" />
			</div>
		);
	}

	if (!activeOrganization) {
		return <OrganizationSelection />;
	}

	return (
		<div className="flex h-screen bg-[var(--color-void)] text-[var(--color-photon)] overflow-hidden">
			{/* Mobile Sidebar Overlay */}
			{isSidebarOpen && (
				<button
					type="button"
					className="fixed inset-0 z-40 bg-black/50 lg:hidden w-full h-full border-none cursor-default"
					onClick={() => setIsSidebarOpen(false)}
					aria-label="Close sidebar"
				/>
			)}

			{/* Sidebar */}
			<aside
				className={`
        fixed lg:static inset-y-0 left-0 z-50
        ${isCollapsed ? "lg:w-20 w-64" : "w-64"} bg-[var(--color-carbon)] border-r border-gray-800
        transition-all duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        flex flex-col
      `}
			>
				{/* Sidebar Header */}
				<div className="h-16 flex items-center px-5 border-b border-gray-800 whitespace-nowrap overflow-hidden shrink-0">
					<Link
						to="/"
						className={`block overflow-hidden text-2xl font-bold tracking-tight text-[var(--color-voltage)] transition-all duration-300 ${isCollapsed ? "w-[120px] opacity-100 lg:w-0 lg:opacity-0 lg:pointer-events-none" : "w-[120px] opacity-100"}`}
					>
						Zentro
					</Link>
					<button
						type="button"
						onClick={() => setIsCollapsed(!isCollapsed)}
						className="p-2 hidden lg:flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors ml-auto"
					>
						{isCollapsed ? (
							<ChevronRight className="w-5 h-5" />
						) : (
							<ChevronLeft className="w-5 h-5" />
						)}
					</button>
				</div>

				{/* Organization Switcher */}
				<div
					className={`p-4 border-b border-gray-800 shrink-0 ${isCollapsed ? "lg:px-2" : ""}`}
				>
					<button
						type="button"
						onClick={async () => {
							await authClient.organization.setActive({ organizationId: null });
							// We don't strictly need to navigate, but forcing a re-render or letting the layout catch it works.
							// Since activeOrganization will become null, AppLayout will re-render and show <OrganizationSelection />
						}}
						className={`flex w-full items-center px-3 py-2.5 rounded-xl border border-gray-700 bg-gray-900/50 hover:bg-gray-800/50 hover:border-gray-600 transition-all text-left overflow-hidden group ${isCollapsed ? "lg:justify-center lg:px-0" : ""}`}
						title={isCollapsed ? "Cambiar organización" : undefined}
					>
						<div className="h-6 w-6 rounded flex items-center justify-center bg-[var(--color-voltage)]/10 text-[var(--color-voltage)] shrink-0 group-hover:bg-[var(--color-voltage)]/20 transition-colors">
							<Building2 className="w-3.5 h-3.5" />
						</div>
						<div
							className={`transition-all duration-300 overflow-hidden ${isCollapsed ? "w-auto opacity-100 ml-3 lg:w-0 lg:opacity-0 lg:ml-0 lg:flex-none" : "w-auto opacity-100 ml-3 flex-1"}`}
						>
							<p className="text-sm font-medium text-white truncate">
								{activeOrganization?.name || "Sin organización"}
							</p>
							<p className="text-xs text-gray-500 truncate">Cambiar</p>
						</div>
					</button>
				</div>

				{/* Navigation */}
				<nav
					className={`flex-1 py-6 px-4 space-y-2 overflow-hidden ${isCollapsed ? "lg:px-2" : ""}`}
				>
					{navItems.map((item) => {
						const isActive = location.pathname.startsWith(item.path);
						const Icon = item.icon;

						return (
							<Link
								key={item.path}
								to={item.path}
								className={`
                  flex items-center px-3 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap
                  ${
										isActive
											? "bg-[var(--color-voltage)]/10 text-[var(--color-voltage)]"
											: "text-gray-400 hover:text-white hover:bg-white/5"
									}
                  ${isCollapsed ? "lg:justify-center lg:px-0" : ""}
                `}
								onClick={() => setIsSidebarOpen(false)}
								title={isCollapsed ? item.name : undefined}
							>
								<Icon className="w-5 h-5 flex-shrink-0" />
								<span
									className={`transition-all duration-300 overflow-hidden ${isCollapsed ? "w-[140px] opacity-100 ml-3 lg:w-0 lg:opacity-0 lg:ml-0" : "w-[140px] opacity-100 ml-3"}`}
								>
									{item.name}
								</span>
							</Link>
						);
					})}
				</nav>

				{/* Sidebar Footer */}
				<div
					className={`p-4 border-t border-gray-800 overflow-hidden ${isCollapsed ? "lg:px-2" : ""}`}
				>
					<button
						type="button"
						onClick={async () => {
							await authClient.signOut();
							navigate({ to: "/login" });
						}}
						className={`flex w-full items-center px-3 py-2.5 rounded-xl font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap ${isCollapsed ? "lg:justify-center lg:px-0" : ""}`}
						title={isCollapsed ? "Cerrar sesión" : undefined}
					>
						<LogOut className="w-5 h-5 flex-shrink-0" />
						<span
							className={`transition-all duration-300 overflow-hidden text-left ${isCollapsed ? "w-[140px] opacity-100 ml-3 lg:w-0 lg:opacity-0 lg:ml-0" : "w-[140px] opacity-100 ml-3"}`}
						>
							Cerrar sesión
						</span>
					</button>
				</div>
			</aside>

			{/* Main Content */}
			<div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
				{/* Mobile Header */}
				<header className="lg:hidden h-16 flex items-center px-4 bg-[var(--color-carbon)] border-b border-gray-800">
					<button
						type="button"
						onClick={() => setIsSidebarOpen(true)}
						className="p-2 -ml-2 text-gray-400 hover:text-white"
					>
						<Menu className="w-6 h-6" />
					</button>
					<span className="ml-4 text-xl font-bold text-[var(--color-voltage)]">
						Zentro
					</span>
				</header>

				{/* Page Content */}
				{children}
			</div>
		</div>
	);
}
