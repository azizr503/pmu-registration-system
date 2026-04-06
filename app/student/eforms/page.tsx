'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function StudentEformsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>eForms</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Electronic forms (e-forms) for university processes will be listed here. This section is reserved for future
        integration.
      </CardContent>
    </Card>
  )
}
