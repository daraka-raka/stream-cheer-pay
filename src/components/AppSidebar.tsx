import { Home, Zap, CreditCard, Settings, LogOut, Bell, Sun, Moon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/use-notifications";

const navItems = [
  { path: "/dashboard", icon: Home, label: "Resumo" },
  { path: "/alerts", icon: Zap, label: "Alertas" },
  { path: "/notifications", icon: Bell, label: "Notificações", badge: true },
  { path: "/transactions", icon: CreditCard, label: "Transações" },
  { path: "/settings", icon: Settings, label: "Configurações" },
];

export function AppSidebar() {
  const { signOut } = useAuth();
  const { state } = useSidebar();
  const { unreadCount } = useNotifications();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="bg-[#0e0e12] border-r border-[rgba(255,255,255,0.05)]">
      <SidebarContent>
        <div className="flex items-center gap-3 p-4">
          <span className="text-[rgba(167,139,250,0.5)] text-lg flex-shrink-0">⚡</span>
          {!isCollapsed && (
            <h1 className="font-display text-xl font-extrabold text-foreground">
              Streala
            </h1>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="font-body text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const showBadge = item.badge && unreadCount > 0;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `font-body text-sm transition-all duration-150 ${
                            isActive
                              ? "bg-[rgba(167,139,250,0.08)] border-l-2 border-l-primary text-foreground"
                              : "border-l-2 border-l-transparent hover:bg-[rgba(167,139,250,0.06)] text-muted-foreground hover:text-foreground"
                          }`
                        }
                      >
                        <div className="relative">
                          <Icon className="h-4 w-4" />
                          {showBadge && (
                            <Badge
                              variant="destructive"
                              className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                            >
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </Badge>
                          )}
                        </div>
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[rgba(255,255,255,0.05)] p-2">
        <Button
          variant="ghost"
          size={isCollapsed ? "icon" : "default"}
          className="w-full justify-start font-body text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
