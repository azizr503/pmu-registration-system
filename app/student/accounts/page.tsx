'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function StudentAccountsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Accounts</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Billing and payment integration can be connected here. For now this is a placeholder page aligned with the
        PMU portal structure.
      </CardContent>
    </Card>
  )
}
