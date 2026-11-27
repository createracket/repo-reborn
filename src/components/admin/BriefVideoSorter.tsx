import type { ReactNode } from "react";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRIEF_VIDEO_SLOTS, type BriefVideoSlot } from "@/lib/brief-video-order";

function SortableVideo({ slot, children }: { slot: BriefVideoSlot; children: ReactNode }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: slot });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`relative min-w-0 ${isDragging ? "z-10 opacity-70" : ""}`}>
      <Button type="button" variant="ghost" size="icon" title={`Drag video ${slot} to reorder`} aria-label={`Drag video ${slot} to reorder`} className="absolute right-2 top-2 z-10 size-8 touch-none cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical className="size-4" />
      </Button>
      {children}
    </div>
  );
}

export function BriefVideoSorter({ enabled, onReorder, children }: { enabled: boolean; onReorder: (from: BriefVideoSlot, to: BriefVideoSlot) => void; children: (slot: BriefVideoSlot) => ReactNode }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  if (!enabled) return <>{BRIEF_VIDEO_SLOTS.map((slot) => <div key={slot}>{children(slot)}</div>)}</>;
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
      if (!over || active.id === over.id) return;
      const from = BRIEF_VIDEO_SLOTS.find((slot) => slot === active.id);
      const to = BRIEF_VIDEO_SLOTS.find((slot) => slot === over.id);
      if (from && to) onReorder(from, to);
    }}>
      <SortableContext items={[...BRIEF_VIDEO_SLOTS]} strategy={verticalListSortingStrategy}>
        {BRIEF_VIDEO_SLOTS.map((slot) => <SortableVideo key={slot} slot={slot}>{children(slot)}</SortableVideo>)}
      </SortableContext>
    </DndContext>
  );
}