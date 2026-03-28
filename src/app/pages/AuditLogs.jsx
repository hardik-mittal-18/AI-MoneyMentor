import { useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { clearDemoAuditLogs, getDemoAuditLogs } from "../lib/demoAudit";
function AuditLogs() {
  const [version, setVersion] = useState(0);
  const logs = useMemo(() => {
    void version;
    return getDemoAuditLogs();
  }, [version]);
  return <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>Audit Logs</CardTitle>
              <CardDescription style={{ fontSize: "0.85rem" }}>
                Demo Mode – local logs from broker/SIP/advisor actions.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setVersion((v) => v + 1)}>
                Refresh
              </Button>
              <Button
    variant="destructive"
    onClick={() => {
      clearDemoAuditLogs();
      setVersion((v) => v + 1);
    }}
  >
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No demo audit logs yet.
                  </TableCell>
                </TableRow> : logs.map((l, idx) => <TableRow key={`${l.timestamp}-${idx}`}>
                    <TableCell>{new Date(l.timestamp).toLocaleString()}</TableCell>
                    <TableCell style={{ fontWeight: 700 }}>{l.category}</TableCell>
                    <TableCell>{l.message}</TableCell>
                  </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>;
}
export {
  AuditLogs
};
