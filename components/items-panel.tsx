"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { catalogItems } from "@/lib/items"
import { usePlannerStore } from "@/lib/store"

export function ItemsPanel() {
  const addItem = usePlannerStore((s) => s.addItem)

  return (
    <div className="grid grid-cols-1 gap-2 p-2">
      {catalogItems.map((it) => (
        <Card key={it.id} className="overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">{it.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-2 py-3">
            <div className="h-12 w-12 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
              {it.kind}
            </div>
            <Button
              size="sm"
              onClick={() =>
                addItem({
                  name: it.name,
                  kind: it.kind,
                })
              }
            >
              Add
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
