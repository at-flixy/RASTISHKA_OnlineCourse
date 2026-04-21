import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/order-meta";

export default async function GiftCertificatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const certificates = await db.giftCertificate.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Подарочные сертификаты</h1>
        <p className="text-muted-foreground text-sm mt-1">Управление сертификатами</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Все сертификаты ({certificates.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {certificates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Сертификатов пока нет
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Код</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Email получателя</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Создан</TableHead>
                  <TableHead>Погашен</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-mono text-sm">{cert.code}</TableCell>
                    <TableCell className="text-sm">{formatMoney(cert.amount, cert.currency)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cert.recipientEmail ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cert.redeemedAt ? "secondary" : "success"}>
                        {cert.redeemedAt ? "Погашен" : "Активен"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {cert.createdAt.toLocaleDateString("ru-RU")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {cert.redeemedAt?.toLocaleDateString("ru-RU") ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
