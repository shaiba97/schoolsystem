"use client";

import * as React from "react";
import { Save } from "lucide-react";
import type { PlatformCurrencyRow } from "@/lib/api/platform-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatTimestamp(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toISOString().replace("T", " ").slice(0, 16);
}

export function CurrenciesPanel({
  rows,
  isSuperAdmin,
  onUpdate,
}: {
  rows: PlatformCurrencyRow[];
  isSuperAdmin: boolean;
  onUpdate: (code: string, input: { rateToUsd: number; autoSync?: boolean }) => void;
}) {
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});

  if (rows.length === 0) {
    return (
      <p className="pt-4 text-sm text-muted-foreground">
        No currencies are configured. Run the currency seed to load the supported
        markets.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 pt-4">
      <p className="text-xs text-muted-foreground">
        Rates are quoted as units per 1 USD. Changing a rate moves every converted
        figure in this console immediately.
      </p>
      <div className="border-t">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right">Rate to 1 USD</TableHead>
              <TableHead>Auto sync</TableHead>
              <TableHead>Last updated</TableHead>
              <TableHead className="text-right">Save</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const draft = drafts[row.code] ?? String(row.rateToUsd);
              return (
                <TableRow key={row.code}>
                  <TableCell>
                    <span className="font-mono text-sm font-medium">{row.code}</span>
                    <p className="text-xs text-muted-foreground">{row.name}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={draft}
                      disabled={!isSuperAdmin}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.code]: event.target.value,
                        }))
                      }
                      className="w-32 text-right font-mono"
                      aria-label={`${row.code} rate to 1 USD`}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={row.autoSync}
                      disabled={!isSuperAdmin}
                      onCheckedChange={(checked: boolean) =>
                        onUpdate(row.code, {
                          rateToUsd: Number(draft) || row.rateToUsd,
                          autoSync: checked,
                        })
                      }
                      aria-label={`Live rate sync for ${row.code}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formatTimestamp(row.lastSyncedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!isSuperAdmin}
                      onClick={() =>
                        onUpdate(row.code, { rateToUsd: Number(draft) || row.rateToUsd })
                      }
                    >
                      <Save size={14} aria-hidden />
                      Save
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
