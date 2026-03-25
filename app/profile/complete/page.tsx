"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { AppLayout } from "@/components/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2, User, Phone, MapPin, GraduationCap, Calendar, Globe } from "lucide-react"

interface FormData {
  firstName: string
  lastName: string
  phone: string
  address: string
  major: string
  minor: string
  enrollmentTerm: string
  expectedGraduation: string
  dateOfBirth: string
  nationality: string
}

interface FieldError {
  field: string
  message: string
}

export default function CompleteProfilePage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([])

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    major: "",
    minor: "",
    enrollmentTerm: "",
    expectedGraduation: "",
    dateOfBirth: "",
    nationality: "",
  })

  // Pre-fill form with user data if available
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      }))
    }
  }, [user])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear field error when user starts typing
    setFieldErrors((prev) => prev.filter((err) => err.field !== name))
    setError(null)
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setFieldErrors((prev) => prev.filter((err) => err.field !== name))
    setError(null)
  }

  const validateForm = (): boolean => {
    const errors: FieldError[] = []

    if (!formData.firstName.trim()) {
      errors.push({ field: "firstName", message: "First name is required" })
    }

    if (!formData.lastName.trim()) {
      errors.push({ field: "lastName", message: "Last name is required" })
    }

    if (!formData.phone.trim()) {
      errors.push({ field: "phone", message: "Phone number is required" })
    } else if (!/^\+?[\d\s-()]+$/.test(formData.phone)) {
      errors.push({ field: "phone", message: "Please enter a valid phone number" })
    }

    if (!formData.address.trim()) {
      errors.push({ field: "address", message: "Address is required" })
    }

    if (!formData.major) {
      errors.push({ field: "major", message: "Major is required" })
    }

    if (!formData.enrollmentTerm) {
      errors.push({ field: "enrollmentTerm", message: "Enrollment term is required" })
    }

    if (!formData.expectedGraduation) {
      errors.push({ field: "expectedGraduation", message: "Expected graduation term is required" })
    }

    setFieldErrors(errors)
    return errors.length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!validateForm()) {
      return
    }

    if (!user) {
      setError("You must be logged in to complete your profile")
      return
    }

    setIsSubmitting(true)

    try {
      // Convert "none" to empty string for minor field
      const submitData = {
        ...formData,
        minor: formData.minor === "none" ? "" : formData.minor,
        userId: user.id,
        email: user.email,
      }

      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save profile")
      }

      setSuccess(true)
      // Redirect to profile page after 1.5 seconds
      setTimeout(() => {
        router.push("/profile")
      }, 1500)
    } catch (err) {
      console.error("Profile save error:", err)
      setError(err instanceof Error ? err.message : "Failed to save profile. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getFieldError = (fieldName: string): string | undefined => {
    return fieldErrors.find((err) => err.field === fieldName)?.message
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex-1 bg-pmu-gray flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Redirect if not authenticated
  if (!user) {
    router.push("/login?redirect=/profile/complete")
    return null
  }

  return (
    <AppLayout>
      <div className="flex-1 bg-pmu-gray">
        <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground mb-2">Complete Your Profile</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Please provide the following information to complete your student profile
            </p>
          </div>

          <Card className="border border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Fill in all required fields to complete your profile and access all features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Success Alert */}
                {success && (
                  <Alert className="bg-green-50 border-green-200 text-green-800">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Profile saved successfully! Redirecting to your profile...
                    </AlertDescription>
                  </Alert>
                )}

                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="bg-muted cursor-not-allowed"
                    aria-label="Email address (read-only)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your email address cannot be changed
                  </p>
                </div>

                {/* Personal Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Personal Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-foreground font-medium">
                        First Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={getFieldError("firstName") ? "border-destructive" : ""}
                        placeholder="Enter first name"
                      />
                      {getFieldError("firstName") && (
                        <p className="text-xs text-destructive">{getFieldError("firstName")}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-foreground font-medium">
                        Last Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={getFieldError("lastName") ? "border-destructive" : ""}
                        placeholder="Enter last name"
                      />
                      {getFieldError("lastName") && (
                        <p className="text-xs text-destructive">{getFieldError("lastName")}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-foreground font-medium">
                      Phone Number <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`pl-10 ${getFieldError("phone") ? "border-destructive" : ""}`}
                        placeholder="+966 50 123 4567"
                      />
                    </div>
                    {getFieldError("phone") && (
                      <p className="text-xs text-destructive">{getFieldError("phone")}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-foreground font-medium">
                      Address <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea
                        id="address"
                        name="address"
                        required
                        value={formData.address}
                        onChange={handleInputChange}
                        className={`pl-10 min-h-[100px] ${getFieldError("address") ? "border-destructive" : ""}`}
                        placeholder="Enter your full address"
                      />
                    </div>
                    {getFieldError("address") && (
                      <p className="text-xs text-destructive">{getFieldError("address")}</p>
                    )}
                  </div>
                </div>

                {/* Academic Information Section */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Academic Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="major" className="text-foreground font-medium">
                        Major <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.major}
                        onValueChange={(value) => handleSelectChange("major", value)}
                      >
                        <SelectTrigger
                          id="major"
                          className={`w-full ${getFieldError("major") ? "border-destructive" : ""}`}
                        >
                          <SelectValue placeholder="Select your major" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="software-engineering">Software Engineering</SelectItem>
                          <SelectItem value="computer-science">Computer Science</SelectItem>
                          <SelectItem value="information-systems">Information Systems</SelectItem>
                          <SelectItem value="data-science">Data Science</SelectItem>
                          <SelectItem value="cybersecurity">Cybersecurity</SelectItem>
                          <SelectItem value="business-administration">Business Administration</SelectItem>
                          <SelectItem value="accounting">Accounting</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="mechanical-engineering">Mechanical Engineering</SelectItem>
                          <SelectItem value="electrical-engineering">Electrical Engineering</SelectItem>
                          <SelectItem value="civil-engineering">Civil Engineering</SelectItem>
                        </SelectContent>
                      </Select>
                      {getFieldError("major") && (
                        <p className="text-xs text-destructive">{getFieldError("major")}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="minor" className="text-foreground font-medium">
                        Minor (Optional)
                      </Label>
                      <Select
                        value={formData.minor ? (formData.minor === "" ? "none" : formData.minor) : undefined}
                        onValueChange={(value) => handleSelectChange("minor", value === "none" ? "" : value)}
                      >
                        <SelectTrigger id="minor" className="w-full">
                          <SelectValue placeholder="Select a minor (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="data-science">Data Science</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="entrepreneurship">Entrepreneurship</SelectItem>
                          <SelectItem value="artificial-intelligence">Artificial Intelligence</SelectItem>
                          <SelectItem value="cybersecurity">Cybersecurity</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="enrollmentTerm" className="text-foreground font-medium">
                        Enrollment Term <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.enrollmentTerm}
                        onValueChange={(value) => handleSelectChange("enrollmentTerm", value)}
                      >
                        <SelectTrigger
                          id="enrollmentTerm"
                          className={`w-full ${getFieldError("enrollmentTerm") ? "border-destructive" : ""}`}
                        >
                          <SelectValue placeholder="Select enrollment term" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fall 2023">Fall 2023</SelectItem>
                          <SelectItem value="Spring 2024">Spring 2024</SelectItem>
                          <SelectItem value="Fall 2024">Fall 2024</SelectItem>
                          <SelectItem value="Spring 2025">Spring 2025</SelectItem>
                          <SelectItem value="Fall 2025">Fall 2025</SelectItem>
                        </SelectContent>
                      </Select>
                      {getFieldError("enrollmentTerm") && (
                        <p className="text-xs text-destructive">{getFieldError("enrollmentTerm")}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expectedGraduation" className="text-foreground font-medium">
                        Expected Graduation <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.expectedGraduation}
                        onValueChange={(value) => handleSelectChange("expectedGraduation", value)}
                      >
                        <SelectTrigger
                          id="expectedGraduation"
                          className={`w-full ${getFieldError("expectedGraduation") ? "border-destructive" : ""}`}
                        >
                          <SelectValue placeholder="Select expected graduation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Spring 2025">Spring 2025</SelectItem>
                          <SelectItem value="Fall 2025">Fall 2025</SelectItem>
                          <SelectItem value="Spring 2026">Spring 2026</SelectItem>
                          <SelectItem value="Fall 2026">Fall 2026</SelectItem>
                          <SelectItem value="Spring 2027">Spring 2027</SelectItem>
                          <SelectItem value="Fall 2027">Fall 2027</SelectItem>
                          <SelectItem value="Spring 2028">Spring 2028</SelectItem>
                        </SelectContent>
                      </Select>
                      {getFieldError("expectedGraduation") && (
                        <p className="text-xs text-destructive">{getFieldError("expectedGraduation")}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Optional Information Section */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Optional Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth" className="text-foreground font-medium">
                        Date of Birth
                      </Label>
                      <Input
                        id="dateOfBirth"
                        name="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        max={new Date().toISOString().split("T")[0]}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nationality" className="text-foreground font-medium">
                        Nationality
                      </Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="nationality"
                          name="nationality"
                          type="text"
                          value={formData.nationality}
                          onChange={handleInputChange}
                          className="pl-10"
                          placeholder="Enter nationality"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4 border-t border-border">
                  <Button
                    type="submit"
                    disabled={isSubmitting || success}
                    className="w-full sm:w-auto bg-pmu-blue hover:bg-pmu-blue/90 text-pmu-white font-medium px-8"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving Profile...
                      </>
                    ) : success ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Profile Saved!
                      </>
                    ) : (
                      "Complete Profile"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}

