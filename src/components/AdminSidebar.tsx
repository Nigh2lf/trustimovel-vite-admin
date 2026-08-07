import { NavLink, useLocation } from "react-router-dom";
import { Building2, Globe, Home, Send, Wrench } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { resourceGroups } from "@/lib/resources";

const GROUP_ICONS: Record<string, typeof Building2> = {
  Contas: Building2,
  "Catálogos do imóvel": Wrench,
  Exportação: Send,
  Endereços: Globe,
};

export const AdminSidebar = () => {
  const { pathname } = useLocation();
  const groups = resourceGroups();

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <p className="text-lg font-bold leading-tight">Elo Admin</p>
        <p className="text-xs text-muted-foreground">Administração do sistema</p>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/inicio"}>
                  <NavLink to="/inicio">
                    <Home className="h-4 w-4" />
                    <span>Início</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {groups.map(({ group, resources }) => {
          const Icon = GROUP_ICONS[group] ?? Wrench;

          return (
            <SidebarGroup key={group}>
              <SidebarGroupLabel>{group}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {resources.map((resource) => (
                    <SidebarMenuItem key={resource.slug}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith(`/${resource.slug}`)}
                      >
                        <NavLink to={`/${resource.slug}`}>
                          <Icon className="h-4 w-4" />
                          <span>{resource.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
};
