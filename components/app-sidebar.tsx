"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { usePlannerStore } from "@/lib/store"
import { CuboidIcon as Cube, Ruler, ShoppingCart } from 'lucide-react'
import { ItemsPanel } from "@/components/items-panel"

export function AppSidebar() {
  const tab = usePlannerStore((s) => s.tab)
  const setTab = usePlannerStore((s) => s.setTab)

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarHeader className="py-4">
        <h1 className="text-lg font-bold text-center">Blueprint 3D</h1>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Modes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={tab === "floorplan"}
                  onClick={() => setTab("floorplan")}
                  tooltip="Edit Floorplan"
                  className={tab === "floorplan" ? "bg-primary text-primary-foreground" : ""}
                >
                  <Ruler className="h-4 w-4" />
                  <span>{"Edit Floorplan"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={tab === "design"}
                  onClick={() => setTab("design")}
                  tooltip="Design"
                  className={tab === "design" ? "bg-primary text-primary-foreground" : ""}
                >
                  <Cube className="h-4 w-4" />
                  <span>{"Design"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={tab === "shop"}
                  onClick={() => setTab("shop")}
                  tooltip="Add Items"
                  className={tab === "shop" ? "bg-primary text-primary-foreground" : ""}
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>{"Add Items"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Catalog</SidebarGroupLabel>
          <SidebarGroupContent>
            {tab === "shop" ? (
              <ItemsPanel />
            ) : (
              <div className="text-xs text-muted-foreground px-2 py-1">
                Switch to "Add Items" to browse catalog.
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}
