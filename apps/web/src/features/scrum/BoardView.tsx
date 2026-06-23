import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  BOARD_COLUMNS,
  IssueStatus,
  type BoardColumnDto,
  type IssueDto,
} from "@pmgt/shared";

const COLUMN_LABEL: Record<IssueStatus, string> = {
  [IssueStatus.BACKLOG]: "Backlog",
  [IssueStatus.TODO]: "To Do",
  [IssueStatus.IN_PROGRESS]: "In Progress",
  [IssueStatus.IN_REVIEW]: "In Review",
  [IssueStatus.DONE]: "Done",
};

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "#94a3b8",
  MEDIUM: "#3b82f6",
  HIGH: "#f59e0b",
  CRITICAL: "#ef4444",
};

export interface BoardViewProps {
  columns: BoardColumnDto[];
  onMove: (issueId: string, status: IssueStatus) => void;
}

// Pure presentational Kanban. Receives columns + a move callback; owns no fetching.
export function BoardView({ columns, onMove }: BoardViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const byStatus = new Map(columns.map((c) => [c.status, c.issues]));

  const onDragEnd = (event: DragEndEvent) => {
    const issueId = String(event.active.id);
    const target = event.over?.id ? (String(event.over.id) as IssueStatus) : null;
    const from = event.active.data.current?.status as IssueStatus | undefined;
    if (target && from && target !== from) {
      onMove(issueId, target);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {BOARD_COLUMNS.map((status) => (
          <Column
            key={status}
            status={status}
            issues={byStatus.get(status) ?? []}
          />
        ))}
      </div>
    </DndContext>
  );
}

function Column({
  status,
  issues,
}: {
  status: IssueStatus;
  issues: IssueDto[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      data-testid={`column-${status}`}
      className={`flex min-h-[12rem] flex-col rounded-lg border p-3 transition ${
        isOver ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-100"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          {COLUMN_LABEL[status]}
        </h3>
        <span className="rounded-full bg-slate-200 px-2 text-xs text-slate-600">
          {issues.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </div>
    </div>
  );
}

function IssueCard({ issue }: { issue: IssueDto }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: issue.id, data: { status: issue.status } });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.6 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`issue-${issue.key}`}
      className="cursor-grab rounded-md border border-slate-200 bg-white p-2 shadow-sm"
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400">{issue.key}</span>
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: PRIORITY_COLOR[issue.priority] ?? "#94a3b8" }}
          title={issue.priority}
        />
      </div>
      <p className="mt-1 text-sm text-slate-800">{issue.title}</p>
      {issue.storyPoints != null && (
        <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 text-xs text-slate-600">
          {issue.storyPoints} pts
        </span>
      )}
    </div>
  );
}
