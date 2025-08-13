"use client"

import { useEffect } from "react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { CameraControlsPanel } from "@/components/camera-controls"
import { RoomCanvas } from "@/components/room-canvas"
import { usePlannerStore } from "@/lib/store"
import { TopBar } from "@/components/top-bar"
import { EnhancedFloorplannerCanvas } from "@/components/floorplanner-canvas"
import { TutorialOverlay } from "@/components/tutorial-overlay"

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
              <EnhancedFloorplannerCanvas />
              <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm p-2 rounded-md shadow-md text-sm">
                <div className="text-xs font-medium mb-1">Floorplan Tools:</div>
                <div className="text-xs">• Draw: Click to add points</div>
                <div className="text-xs">• Move: Drag points</div>
                <div className="text-xs">• Delete: Click on points to delete</div>
                <div className="text-xs">• Shift: Snap to grid</div>
              </div>
            </div>
          ) : (
            <div className="w-full h-[calc(100vh-56px)]">
              <RoomCanvas />
              <CameraControlsPanel />
            </div>
          )}
        </main>
      </SidebarInset>
      <TutorialOverlay />
    </SidebarProvider>
  )
}
