"use client"

import { useEffect } from "react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { CameraControlsPanel } from "@/components/camera-controls"
import { RoomCanvas } from "@/components/room-canvas"
import { usePlannerStore } from "@/lib/store"
import { FloorplannerCanvas } from "@/components/floorplanner-canvas"
import { TopBar } from "@/components/top-bar"

export default function Page() {
  const tab = usePlannerStore((s) => s.tab)
  const setTab = usePlannerStore((s) => s.setTab)

  useEffect(() => {
    if (!tab) setTab("design")
  }, [tab, setTab])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-white">
        <header className="flex items-center gap-2 p-2 border-b">
          <SidebarTrigger />
          <TopBar />
        </header>

        <main className="relative flex-1">
          {tab === "floorplan" ? (
            <div className="w-full h-[calc(100vh-56px)]">
              <FloorplannerCanvas />
            </div>
          ) : (
            <div className="w-full h-[calc(100vh-56px)]">
              <RoomCanvas />
              <CameraControlsPanel />
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
