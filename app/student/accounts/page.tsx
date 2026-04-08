'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function StudentAccountsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Current Semester: Spring 2026</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">Balance Due: SAR 0.00</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statement</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Tuition Fee Spring 2026</TableCell>
                <TableCell className="text-right">SAR 12,500.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Scholarship Applied</TableCell>
                <TableCell className="text-right text-emerald-600">-SAR 12,500.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Balance</TableCell>
                <TableCell className="text-right font-semibold text-emerald-600">SAR 0.00</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>View Holds</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-emerald-600">No holds on your account ✅</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>2026-01-12</TableCell>
                <TableCell>Bank Transfer</TableCell>
                <TableCell>Completed</TableCell>
                <TableCell className="text-right">SAR 8,000.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2026-01-18</TableCell>
                <TableCell>Card</TableCell>
                <TableCell>Completed</TableCell>
                <TableCell className="text-right">SAR 4,500.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2026-01-20</TableCell>
                <TableCell>Scholarship Credit</TableCell>
                <TableCell>Applied</TableCell>
                <TableCell className="text-right text-emerald-600">-SAR 12,500.00</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
