'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function FacultyOfficeHoursPage() {
  const [editing, setEditing] = useState(false)
  const [selectedDays, setSelectedDays] = useState(['Sun', 'Mon', 'Tue', 'Wed', 'Thu'])
  const [start, setStart] = useState('12:00')
  const [end, setEnd] = useState('14:00')
  const [location, setLocation] = useState('Building 3, Room 210')
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu']

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Office Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#1a5fb4]">Students can find you at: {location}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="grid min-w-[560px] grid-cols-5 gap-2">
            {days.map(day => (
              <div key={day} className="rounded-md border border-border p-2">
                <p className="mb-2 text-center text-sm font-medium">{day}</p>
                {selectedDays.includes(day) ? (
                  <div className="rounded-md bg-[#1a5fb4] px-2 py-3 text-center text-xs text-white">
                    {start} - {end}
                  </div>
                ) : (
                  <div className="rounded-md bg-muted px-2 py-3 text-center text-xs text-muted-foreground">No Hours</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button className="bg-[#e05a00] text-white hover:bg-[#c94f00]" onClick={() => setEditing(v => !v)}>
        {editing ? 'Close Editor' : 'Edit Office Hours'}
      </Button>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Office Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Days</Label>
              <div className="flex flex-wrap gap-3 text-sm">
                {days.map(day => (
                  <label key={day} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedDays.includes(day)}
                      onChange={e =>
                        setSelectedDays(prev => (e.target.checked ? [...prev, day] : prev.filter(d => d !== day)))
                      }
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={start} onChange={e => setStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={end} onChange={e => setEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            <Button className="bg-[#1a5fb4] text-white hover:bg-[#154a96]">Save</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
