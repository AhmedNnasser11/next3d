"use client";

import { usePlannerStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function CeilingControls() {
  const wallHeight = usePlannerStore((s) => s.wallHeight);
  const setWallHeight = usePlannerStore((s) => s.setWallHeight);
  
  const ceilingVisible = usePlannerStore((s) => s.ceilingVisible);
  const setCeilingVisible = usePlannerStore((s) => s.setCeilingVisible);
  
  const ceilingColor = usePlannerStore((s) => s.ceilingColor);
  const setCeilingColor = usePlannerStore((s) => s.setCeilingColor);
  
  const ceilingTexOn = usePlannerStore((s) => s.ceilingTexOn);
  const setCeilingTexOn = usePlannerStore((s) => s.setCeilingTexOn);

  const [heightValue, setHeightValue] = useState(wallHeight);

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setHeightValue(value);
    setWallHeight(value);
  };

  return (
    <div className="p-4 space-y-4 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Edit Ceiling</h3>
      </div>

      {/* Wall Height Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="wall-height" className="text-sm font-medium">Wall Height</label>
          <span className="text-sm text-gray-500">{heightValue.toFixed(1)}m</span>
        </div>
        <input
          id="wall-height"
          type="range"
          min={2}
          max={4}
          step={0.1}
          value={heightValue}
          onChange={handleHeightChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Ceiling Visibility */}
      <div className="flex items-center justify-between">
        <label htmlFor="ceiling-visible" className="text-sm font-medium">Show Ceiling</label>
        <div className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            id="ceiling-visible" 
            className="sr-only" 
            checked={ceilingVisible}
            onChange={(e) => setCeilingVisible(e.target.checked)}
          />
          <div className={`w-11 h-6 rounded-full transition ${ceilingVisible ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${ceilingVisible ? 'transform translate-x-5' : ''}`}></div>
        </div>
      </div>

      {/* Ceiling Color */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Ceiling Color</label>
          <div className="relative">
            <Button
              variant="outline"
              className="w-10 h-10 p-0 border-2"
              style={{ backgroundColor: ceilingColor }}
              onClick={() => {}}
            >
              <span className="sr-only">Pick Color</span>
            </Button>
            <div className="absolute right-0 mt-2 w-64 p-2 bg-white border rounded-md shadow-lg z-10 hidden">
              <div className="grid grid-cols-5 gap-2">
                {[
                  "#f0f0f0", "#e5e5e5", "#d9d9d9", "#cccccc", "#ffffff",
                  "#f5f5dc", "#fffdd0", "#f8f8ff", "#f0f8ff", "#f0ffff"
                ].map((color) => (
                  <Button
                    key={color}
                    variant="outline"
                    className={cn(
                      "w-8 h-8 p-0 border-2",
                      ceilingColor === color && "ring-2 ring-black"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setCeilingColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ceiling Texture */}
      <div className="flex items-center justify-between">
        <label htmlFor="ceiling-texture" className="text-sm font-medium">Show Texture</label>
        <div className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            id="ceiling-texture" 
            className="sr-only" 
            checked={ceilingTexOn}
            onChange={(e) => setCeilingTexOn(e.target.checked)}
          />
          <div className={`w-11 h-6 rounded-full transition ${ceilingTexOn ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${ceilingTexOn ? 'transform translate-x-5' : ''}`}></div>
        </div>
      </div>

      <div className="pt-2">
        <Button 
          className="w-full" 
          onClick={() => {
            // Apply changes
            setWallHeight(heightValue);
          }}
        >
          Apply Changes
        </Button>
      </div>
    </div>
  );
}