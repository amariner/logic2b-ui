import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const notificationPreferences = [
  { id: "product-updates", title: "Product updates", description: "News about features, improvements, and product changes.", checked: true },
  { id: "security-alerts", title: "Security alerts", description: "Important notices about your account and sign-in activity.", checked: true },
  { id: "weekly-digest", title: "Weekly digest", description: "A summary of your workspace activity every Monday.", checked: false },
]

export default function App() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 text-foreground sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-8">
          <p className="mb-2 font-mono text-xs font-medium uppercase tracking-[0.18em] text-primary">Personal workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Account settings</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Manage your profile, notification preferences, and account security.
          </p>
        </header>

        <Tabs defaultValue="profile" className="gap-6">
          <div className="overflow-x-auto pb-1">
            <TabsList aria-label="Account settings sections" className="w-full min-w-max justify-start sm:w-fit">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="profile">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-lg">Profile details</CardTitle>
                <CardDescription>Update how your name and contact details appear across your workspace.</CardDescription>
              </CardHeader>
              <CardContent>
                <form id="profile-form" className="grid gap-6" onSubmit={(event) => event.preventDefault()}>
                  <div className="grid gap-2">
                    <Label htmlFor="full-name">Full name</Label>
                    <Input id="full-name" name="fullName" autoComplete="name" defaultValue="Alex Morgan" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input id="email" name="email" type="email" autoComplete="email" defaultValue="alex@northstar.studio" aria-describedby="email-help" />
                    <p id="email-help" className="text-xs leading-5 text-muted-foreground">
                      We’ll use this address for account and security notifications.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" name="company" autoComplete="organization" defaultValue="Northstar Studio" />
                  </div>
                </form>
              </CardContent>
              <CardFooter className="justify-end gap-3 border-t">
                <Button type="reset" form="profile-form" variant="outline">Cancel</Button>
                <Button type="submit" form="profile-form">Save changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-lg">Email notifications</CardTitle>
                <CardDescription>Choose which messages you want to receive. You can change these anytime.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                {notificationPreferences.map((preference) => (
                  <div key={preference.id} className="flex items-start justify-between gap-6 py-5 first:pt-0 last:pb-0">
                    <div className="grid gap-1.5">
                      <Label htmlFor={preference.id}>{preference.title}</Label>
                      <p className="text-sm leading-5 text-muted-foreground">{preference.description}</p>
                    </div>
                    <Switch id={preference.id} name={preference.id} defaultChecked={preference.checked} />
                  </div>
                ))}
              </CardContent>
              <CardFooter className="justify-end border-t"><Button>Save preferences</Button></CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-lg">Password</CardTitle>
                <CardDescription>Use at least 12 characters with a mix of letters, numbers, and symbols.</CardDescription>
              </CardHeader>
              <CardContent>
                <form id="password-form" className="grid gap-6" onSubmit={(event) => event.preventDefault()}>
                  <div className="grid gap-2">
                    <Label htmlFor="current-password">Current password</Label>
                    <Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" />
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 sm:gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="new-password">New password</Label>
                      <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirm-password">Confirm password</Label>
                      <Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" />
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="justify-end border-t">
                <Button type="submit" form="password-form">Update password</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-xs text-muted-foreground">Last account update: August 28, 2026</p>
      </div>
    </main>
  )
}
