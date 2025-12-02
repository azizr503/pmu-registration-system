import {
  Calendar,
  User,
  BookOpen,
  CreditCard,
  FileText,
  Clock,
  GraduationCap,
  Receipt,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ServiceCard } from "@/components/ui/service-card"
import { StatCard } from "@/components/ui/stat-card"

const services = [
  {
    icon: Calendar,
    title: "Attendance Tracking",
    description: "View your attendance records and statistics",
    color: "text-pmu-blue",
  },
  {
    icon: User,
    title: "Student Profile",
    description: "Update your personal information",
    color: "text-pmu-gold",
  },
  {
    icon: BookOpen,
    title: "Class List",
    description: "View your registered courses",
    color: "text-pmu-blue",
  },
  {
    icon: CreditCard,
    title: "Account Summary",
    description: "Check your financial status",
    color: "text-pmu-gold",
  },
  {
    icon: Receipt,
    title: "Payment History",
    description: "View past transactions",
    color: "text-pmu-blue",
  },
  {
    icon: Clock,
    title: "Class Schedule",
    description: "View your weekly schedule",
    color: "text-pmu-gold",
  },
  {
    icon: GraduationCap,
    title: "Academic Progress",
    description: "Track your degree completion",
    color: "text-pmu-blue",
  },
  {
    icon: FileText,
    title: "Transcripts",
    description: "Request official transcripts",
    color: "text-pmu-gold",
  },
]

const alerts = [
  {
    type: "warning",
    message: "Registration for Spring 2025 opens on December 15th",
    icon: AlertCircle,
  },
  {
    type: "info",
    message: "Final exam schedule is now available",
    icon: Info,
  },
]

export function DashboardContent() {
  return (
    <div className="min-h-screen bg-pmu-gray">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Student Services</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Welcome back! Access your academic services below.
          </p>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-8 space-y-3">
            {alerts.map((alert, index) => {
              const Icon = alert.icon
              return (
                <Alert
                  key={index}
                  className={
                    alert.type === "warning"
                      ? "bg-pmu-gold/10 border-pmu-gold/30 text-pmu-gold-dark"
                      : "bg-pmu-blue/10 border-pmu-blue/30 text-pmu-blue"
                  }
                >
                  <Icon className="h-4 w-4" />
                  <AlertDescription className="font-medium">{alert.message}</AlertDescription>
                </Alert>
              )
            })}
          </div>
        )}

        {/* Services Grid */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-foreground mb-4">Available Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {services.map((service) => (
              <ServiceCard
                key={service.title}
                icon={service.icon}
                title={service.title}
                description={service.description}
                color={service.color}
              />
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Stats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <StatCard
              title="Current GPA"
              value="3.75"
              subtitle="Out of 4.00"
            />
            <StatCard
              title="Completed Credits"
              value="87"
              subtitle="Out of 120 required"
            />
            <StatCard
              title="Account Balance"
              value="$0.00"
              subtitle="Account is clear"
              className="sm:col-span-2 lg:col-span-1"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
