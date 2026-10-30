import type { Matrix } from "./math";
import type { MatrixGroup, MatrixItem } from "./engine";

export function MatrixTable({
  label,
  values,
  highlight,
  compact = false,
}: {
  label?: string;
  values: Matrix;
  highlight?: (row: number, col: number) => boolean;
  compact?: boolean;
}) {
  return (
    <div className={`nn-mini-matrix ${compact ? "is-compact" : ""}`}>
      {label && <span className="nn-matrix-label">{label}</span>}
      <table>
        <tbody>
          {values.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((value, colIndex) => (
                <td
                  key={colIndex}
                  className={`${value > 0 ? "is-pos" : value < 0 ? "is-neg" : ""} ${
                    highlight?.(rowIndex, colIndex) ? "is-highlight" : ""
                  }`}
                >
                  {formatCell(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value: number) {
  const rounded = Number(value.toFixed(3));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

export function MatrixCard({ item }: { item: MatrixItem }) {
  return (
    <figure className="nn-matrix-card">
      <figcaption>
        {item.label} · {item.shape[0]}×{item.shape[1]}
      </figcaption>
      <MatrixTable values={item.values} compact />
    </figure>
  );
}

export function MatrixGroupRow({ group }: { group: MatrixGroup }) {
  const ops = group.ops ?? [];
  return (
    <div className="nn-matrix-row">
      {group.label && <span className="nn-matrix-row-label">{group.label}</span>}
      {group.items.map((item, index) => (
        <div className="nn-matrix-slot" key={`${item.label}-${index}`}>
          {index > 0 && ops[index - 1] && <span className="nn-matrix-op">{ops[index - 1]}</span>}
          <MatrixCard item={item} />
        </div>
      ))}
    </div>
  );
}

export function MatrixPanel({ title, groups }: { title: string; groups: MatrixGroup[] }) {
  return (
    <div className="nn-matrix-panel" aria-live="polite">
      <div className="nn-matrix-panel-title">{title}</div>
      {groups.map((group, index) => (
        <MatrixGroupRow key={`${group.label ?? "grupo"}-${index}`} group={group} />
      ))}
    </div>
  );
}
