'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function StudentEformsPage() {
  const forms = [
    ['Course Withdrawal Request', 'Request withdrawal from a currently enrolled course.'],
    ['Graduation Clearance', 'Apply for graduation and clearance review.'],
    ['Change of Major', 'Submit request to move to a different major.'],
    ['Internship Request', 'Register an internship placement for approval.'],
    ['Leave of Absence', 'Apply for a temporary leave from studies.'],
    ['Tuition Refund', 'Request refund review for eligible payments.'],
    ['Change of Degree Plan', 'Update your approved degree plan track.'],
    ['Attestation Letter', 'Request an official attestation letter.'],
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>eForms</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {forms.map(([title, desc]) => (
            <div key={title} className="rounded-lg border border-border bg-white p-4 shadow-sm">
              <p className="font-semibold text-[#1a5fb4]">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              <Button className="mt-3 bg-[#e05a00] text-white hover:bg-[#c94f00]">Submit</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="rounded-md border border-border p-3">
            Course Withdrawal Request — <span className="font-medium text-amber-600">Pending Review</span>
          </div>
          <div className="rounded-md border border-border p-3">
            Attestation Letter — <span className="font-medium text-blue-600">In Progress</span>
          </div>
          <div className="rounded-md border border-border p-3">
            Internship Request — <span className="font-medium text-emerald-600">Approved</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
