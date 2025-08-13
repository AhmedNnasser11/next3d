"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePlannerStore } from "@/lib/store";
import { downloadText } from "@/lib/download";
import { Toggle } from "@/components/ui/toggle";
import { useState } from "react";
import { Loader2, Home } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CeilingControls } from "@/components/ceiling-controls";

export function TopBar() {
  const serialize = usePlannerStore((s) => s.serialize);
  const loadFromJson = usePlannerStore((s) => s.loadFromJson);
  const newPlan = usePlannerStore((s) => s.reset);
  const floorColor = usePlannerStore((s) => s.floorColor);
  const setFloorColor = usePlannerStore((s) => s.setFloorColor);
  const floorTexOn = usePlannerStore((s) => s.floorTexOn);
  const setFloorTexOn = usePlannerStore((s) => s.setFloorTexOn);
  const buildFromFloorplan = usePlannerStore((s) => s.buildFromFloorplan);
  const tab = usePlannerStore((s) => s.tab);
  const setTab = usePlannerStore((s) => s.setTab);
  const [isLoading, setIsLoading] = useState(false);
  const [showTips, setShowTips] = useState(true);

  function onSave() {
    const data = serialize();
    downloadText("design.json", data);
  }

  async function onLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const text = await file.text();
      loadFromJson(text);
    } catch (error) {
      console.error("Error loading file:", error);
    } finally {
      setIsLoading(false);
      e.currentTarget.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap justify-between">
      <div className="flex items-center gap-2">
        <Button 
          variant={tab === "floorplan" ? "default" : "outline"} 
          size="sm" 
          onClick={() => setTab("floorplan")}
        >
          Floorplan
          {tab === "floorplan" && showTips && (
            <Badge variant="secondary" className="ml-2 text-xs">
              Draw Plan
            </Badge>
          )}
        </Button>
        <Button 
          variant={tab === "design" ? "default" : "outline"} 
          size="sm"
          onClick={() => {
            if (tab === "floorplan") {
              buildFromFloorplan();
            }
            setTab("design");
          }}
        >
          Design
          {tab === "design" && showTips && (
            <Badge variant="secondary" className="ml-2 text-xs">
              Room Design
            </Badge>
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {tab === "design" && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Home className="h-4 w-4 mr-1" />
                Roof
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Roof & Ceiling</DialogTitle>
              </DialogHeader>
              <CeilingControls />
            </DialogContent>
          </Dialog>
        )}
        <Tooltip content="Create New Design">
          <Button variant="outline" size="sm" onClick={newPlan}>
            New
          </Button>
        </Tooltip>
        <Tooltip content="Save Current Design">
          <Button variant="outline" size="sm" onClick={onSave}>
            Save
          </Button>
        </Tooltip>
        <div className="relative">
          <Tooltip content="Load Saved Design">
            <div className="relative">
              <Input 
                type="file" 
                id="load-file"
                className="h-8 w-[80px] opacity-0 absolute inset-0 cursor-pointer z-10" 
                onChange={onLoad} 
                disabled={isLoading}
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="w-[80px] h-8"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Loading
                  </>
                ) : (
                  "Load"
                )}
              </Button>
            </div>
          </Tooltip>
        </div>
      </div>

      <div className="mx-2 h-6 w-px bg-border" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Floor:</span>
        <input
          aria-label="Floor color"
          type="color"
          className="h-6 w-8 p-0 border rounded"
          value={floorColor}
          onChange={(e) => setFloorColor(e.target.value)}
        />
        <Toggle
          pressed={floorTexOn}
          onPressedChange={setFloorTexOn}
          className="h-7 text-xs"
          aria-label="Toggle floor texture"
        >
          Texture
        </Toggle>
      </div>

      <div className="mx-2 h-6 w-px bg-border" />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={() => {
            buildFromFloorplan();
            setTab("design");
          }}
        >
          Build 3D
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowTips(!showTips)}
        >
          {showTips ? "Hide Tips" : "Show Tips"}
        </Button>
      </div>
    </div>
  );
}
