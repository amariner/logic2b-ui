import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function App() {
  const [saved, setSaved] = useState(false)

  function saveChanges() {
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2200)
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-3xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-medium text-primary">Account</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Settings</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Manage your profile, preferences, and account security.
          </p>
        </header>

        <Tabs defaultValue="profile" className="gap-6">
          <TabsList aria-label="Account settings sections" className="w-full justify-start rounded-lg bg-muted p-1 sm:w-fit">
            <TabsTrigger value="profile" className="px-4">Profile</TabsTrigger>
            <TabsTrigger value="preferences" className="px-4">Preferences</TabsTrigger>
            <TabsTrigger value="security" className="px-4">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profile information</CardTitle>
                <CardDescription>This information will appear on your workspace profile.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="first-name">First name</Label>
                  <Input id="first-name" name="first-name" defaultValue="Avery" autoComplete="given-name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input id="last-name" name="last-name" defaultValue="Morgan" autoComplete="family-name" />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" name="email" type="email" defaultValue="avery@acme.co" autoComplete="email" />
                  <p className="text-xs leading-5 text-muted-foreground">Used for notifications and sign-in.</p>
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="job-title">Job title</Label>
                  <Input id="job-title" name="job-title" defaultValue="Product Designer" autoComplete="organization-title" />
                </div>
              </CardContent>
              <CardFooter className="justify-between border-t pt-6">
                <p aria-live="polite" className="text-sm text-muted-foreground">{saved ? "Changes saved." : ""}</p>
                <Button type="button" onClick={saveChanges}>Save changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preferences</CardTitle>
                <CardDescription>Choose how you want to hear from us.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <PreferenceRow id="product-updates" title="Product updates" description="Receive a monthly summary of new features and improvements." defaultChecked />
                <PreferenceRow id="weekly-digest" title="Weekly digest" description="Get a concise roundup of your workspace activity every Monday." defaultChecked />
                <PreferenceRow id="marketing-email" title="Marketing email" description="Occasional tips, offers, and stories from the team." />
              </CardContent>
              <CardFooter className="justify-end border-t pt-6">
                <Button type="button" onClick={saveChanges}>Save preferences</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Security</CardTitle>
                <CardDescription>Keep your account secure with an extra verification step.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <PreferenceRow id="two-factor-authentication" title="Two-factor authentication" description="Require a verification code when signing in on a new device." defaultChecked />
                <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Password</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Last changed 3 months ago.</p>
                  </div>
                  <Button type="button" variant="outline">Change password</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  )
}

function PreferenceRow({
  id,
  title,
  description,
  defaultChecked = false,
}: {
  id: string
  title: string
  description: string
  defaultChecked?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-5 first:pt-0 last:pb-0">
      <div className="grid gap-1.5">
        <Label htmlFor={id}>{title}</Label>
        <p id={`${id}-description`} className="max-w-lg text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} defaultChecked={defaultChecked} aria-describedby={`${id}-description`} />
    </div>
  )
}
