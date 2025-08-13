"use client";

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { catalogItems } from "@/lib/items";
import { usePlannerStore } from "@/lib/store";
import { useState } from "react";

// Group items by category for better organization
const groupedItems = catalogItems.reduce((acc, item) => {
  const category = item.kind.charAt(0).toUpperCase() + item.kind.slice(1);
  if (!acc[category]) {
    acc[category] = [];
  }
  acc[category].push(item);
  return acc;
}, {} as Record<string, typeof catalogItems>);

// Sort categories for consistent display
const sortedCategories = Object.keys(groupedItems).sort();

// Category icons mapping
const categoryIcons: Record<string, string> = {
  Chair: "🪑",
  Table: "🪵",
  Sofa: "🛋️",
  Bed: "🛏️",
  Storage: "📦",
  Lamp: "💡",
  Plant: "🪴",
  Rug: "🧶",
  Door: "🚪",
  Window: "🪟",
  Decor: "🎭",
};

export function ItemsPanel() {
  const addItem = usePlannerStore((s) => s.addItem);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    sortedCategories.reduce((acc, category) => ({ ...acc, [category]: true }), {})
  );

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Filter items based on search term
  const filteredCategories = searchTerm
    ? sortedCategories.filter(category =>
        groupedItems[category].some(item =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.kind.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : sortedCategories;

  return (
    <div className="flex flex-col gap-4 p-2 overflow-y-auto max-h-[calc(100vh-200px)]">
      {/* Search input */}
      <div className="sticky top-0 z-10 bg-white pb-2">
        <input
          type="text"
          placeholder="بحث عن عناصر..."
          className="w-full p-2 border rounded-md text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredCategories.map((category) => {
        const items = searchTerm
          ? groupedItems[category].filter(
              item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.kind.toLowerCase().includes(searchTerm.toLowerCase())
            )
          : groupedItems[category];

        if (items.length === 0) return null;

        return (
          <div key={category} className="space-y-2 border-b pb-3 last:border-b-0">
            <div 
              className="flex items-center cursor-pointer" 
              onClick={() => toggleCategory(category)}
            >
              <span className="mr-2 text-lg">{categoryIcons[category] || "📋"}</span>
              <h3 className="text-sm font-medium">{category}</h3>
              <Badge variant="outline" className="ml-2 text-xs">{items.length}</Badge>
              <Separator className="flex-1 ml-2" />
              <span className="text-xs">{expandedCategories[category] ? "▼" : "▶"}</span>
            </div>
            
            {expandedCategories[category] && (
              <div className="grid grid-cols-2 gap-2">
                {items.map((item) => (
                  <Tooltip key={item.id} content={`إضافة ${item.name}`}>
                    <Card
                      className="overflow-hidden hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() =>
                        addItem({
                          name: item.name,
                          kind: item.kind,
                          model: item.model,
                        })
                      }
                    >
                      <div className="p-2 text-center">
                        <div className="h-16 w-full rounded bg-muted flex items-center justify-center mb-1 relative overflow-hidden">
                          <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-30">
                            {categoryIcons[category] || "📋"}
                          </div>
                          <p className="text-xs truncate">{item.name}</p>
                        </div>
                      </div>
                    </Card>
                  </Tooltip>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
