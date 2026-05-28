import { Link, useLocation, Outlet } from "react-router-dom";
import { Globe, GitCompare, BarChart3 } from "lucide-react";

const navItems = [
  { path: "/", label: "Overview", icon: Globe },
  { path: "/rrg", label: "RRG", icon: BarChart3 },
  { path: "/comparisons", label: "Comparisons", icon: GitCompare },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Navigation */}
      <nav className="shrink-0 bg-white border-b border-gray-200">
        <div className="flex items-center gap-1 px-4 py-2">
          <div className="flex items-center gap-2 mr-6">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <BarChart3 size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold text-gray-800">StockCentral</span>
          </div>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <item.icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Page Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
