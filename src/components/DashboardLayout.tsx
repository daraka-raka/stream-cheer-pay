import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Home, Zap, CreditCard, Settings, LogOut, Moon, Sun } from "lucide-react";
import logo from "@/assets/logo.png";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { signOut } = useAuth();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { path: "/dashboard", icon: Home, label: "Resumo" },
    { path: "/alerts", icon: Zap, label: "Alertas" },
    { path: "/transactions", icon: CreditCard, label: "Transações" },
    { path: "/settings", icon: Settings, label: "Configurações" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-border bg-card p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <img src={logo} alt="Streala" className="h-10 w-10" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Streala
          </h1>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className="w-full justify-start"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-border pt-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <>
                <Sun className="mr-2 h-4 w-4" />
                Modo Claro
              </>
            ) : (
              <>
                <Moon className="mr-2 h-4 w-4" />
                Modo Escuro
              </>
            )}
          </Button>
          <Button variant="ghost" className="w-full justify-start text-destructive" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">{children}</main>
    </div>
  );
};
