import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PlaceholderPage({
  title,
  description,
  phase,
  children,
}: {
  title: string;
  description: string;
  phase: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Not wired yet</CardTitle>
          <CardDescription>
            This view arrives in {phase}. The route, navigation, and session
            plumbing are in place so nothing dead-ends.
          </CardDescription>
        </CardHeader>
        {children && <CardContent>{children}</CardContent>}
      </Card>
    </div>
  );
}
