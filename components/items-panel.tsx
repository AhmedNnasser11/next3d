"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { catalogItems } from "@/lib/items"
import { usePlannerStore } from "@/lib/store"

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

export function ItemsPanel() {
  const addItem = usePlannerStore((s) => s.addItem)

  return (
    <div className="flex flex-col gap-4 p-2 overflow-y-auto max-h-[calc(100vh-200px)]">
      {sortedCategories.map((category) => (
        <div key={category} className="space-y-2">
          <div className="flex items-center">
            <h3 className="text-sm font-medium">{category}</h3>
            <Separator className="flex-1 ml-2" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {groupedItems[category].map((item) => (
              <Card key={item.id} className="overflow-hidden hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => addItem({
                  name: item.name,
                  kind: item.kind,
                  model: item.model
                })}
              >
                <div className="p-2 text-center">
                  <div className="h-12 w-full rounded bg-muted flex items-center justify-center mb-1">
                    <span className="text-xs text-muted-foreground">{item.kind}</span>
                  </div>
                  <p className="text-xs truncate">{item.name}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
