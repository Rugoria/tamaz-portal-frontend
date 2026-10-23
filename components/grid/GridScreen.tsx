"use client";

import type { ReactNode } from "react";
import { useApi } from "@/lib/hooks";
import { useGridRows, useGridSpec } from "@/lib/grid/registry";
import type { AvailableViews } from "@/lib/grid/engine";
import { DataGrid } from "@/components/grid/DataGrid";

/** A full grid for one grid key: loads the rows and this person's templates, and draws the grid with its view selector. */
export function GridScreen({ grid, base, emptyTitle, emptyText, toolbarExtra, renderCard, searchPlaceholder, rowsKey }: {
  grid: string;
  /** Where a clinic or doctor's pages live: "/clinic" or "/doctor". */
  base?: string;
  emptyTitle: string;
  emptyText?: string;
  toolbarExtra?: ReactNode;
  renderCard?: (row: never) => ReactNode;
  searchPlaceholder?: string;
  /** Change this to reload the rows (for example after creating an account). */
  rowsKey?: number;
}) {
  const spec = useGridSpec(grid, base);
  const views = useApi<AvailableViews>(`/views?grid=${grid}`);
  const data = useGridRows<never>(spec.path ? `${spec.path}${rowsKey ? `${spec.path.includes("?") ? "&" : "?"}v=${rowsKey}` : ""}` : null);
  return (
    <DataGrid
      defs={spec.defs}
      rows={data.rows}
      rowKey={spec.rowKey}
      rowHref={spec.rowHref}
      rowBg={spec.rowBg}
      views={views.data}
      builtIn={spec.builtIn}
      loading={data.loading || (views.loading && !views.error)}
      error={data.error}
      onRetry={data.reload}
      emptyTitle={emptyTitle}
      emptyText={emptyText}
      toolbarExtra={toolbarExtra}
      renderCard={renderCard as never}
      searchPlaceholder={searchPlaceholder}
    />
  );
}
