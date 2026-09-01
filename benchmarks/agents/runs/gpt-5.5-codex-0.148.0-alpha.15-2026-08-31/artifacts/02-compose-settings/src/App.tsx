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

const profileFields = [
  {
    id: "display-name",
    label: "Display name",
    type: "text",
    defaultValue: "Maya Chen",
  },
  {
    id: "email",
    label: "Email address",
    type: "email",
    defaultValue: "maya.chen@example.com",
  },
  {
    id: "username",
    label: "Username",
    type: "text",
    defaultValue: "maya.chen",
  },
]

const notificationSettings = [
  {
    id: "product-updates",
    label: "Product updates",
    description: "Receive release notes and account notices.",
    defaultChecked: true,
  },
  {
    id: "billing-alerts",
    label: "Billing alerts",
    description: "Get notified about invoices and payment changes.",
    defaultChecked: true,
  },
  {
    id: "weekly-summary",
    label: "Weekly summary",
    description: "Send a digest of workspace activity every Monday.",
    defaultChecked: false,
  },
]

export default function App() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <section
        aria-labelledby="account-settings-title"
        className="mx-auto flex w-full max-w-5xl flex-col gap-6"
      >
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase text-muted-foreground">
            Account
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <h1
                id="account-settings-title"
                className="text-3xl font-semibold sm:text-4xl"
              >
                Settings
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                Manage profile details, notifications, and account security.
              </p>
            </div>
            <Button type="button" variant="outline">
              Export data
            </Button>
          </div>
        </div>

        <Tabs defaultValue="profile" className="gap-4">
          <TabsList aria-label="Account settings sections" className="w-full sm:w-fit">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile details</CardTitle>
                <CardDescription>
                  Keep your public account information up to date.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                {profileFields.map((field) => (
                  <div key={field.id} className="grid gap-2">
                    <Label htmlFor={field.id}>{field.label}</Label>
                    <Input
                      id={field.id}
                      name={field.id}
                      type={field.type}
                      defaultValue={field.defaultValue}
                    />
                  </div>
                ))}
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    name="organization"
                    type="text"
                    defaultValue="Northstar Analytics"
                  />
                </div>
              </CardContent>
              <CardFooter className="justify-end gap-3 border-t">
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
                <Button type="button">Save changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification preferences</CardTitle>
                <CardDescription>
                  Choose which account updates are delivered to your inbox.
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                {notificationSettings.map((setting) => (
                  <div
                    key={setting.id}
                    className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <Label htmlFor={setting.id}>{setting.label}</Label>
                      <p className="text-sm text-muted-foreground">
                        {setting.description}
                      </p>
                    </div>
                    <Switch
                      id={setting.id}
                      name={setting.id}
                      defaultChecked={setting.defaultChecked}
                      aria-label={setting.label}
                    />
                  </div>
                ))}
              </CardContent>
              <CardFooter className="justify-end border-t">
                <Button type="button">Update preferences</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>
                  Review sign-in details and protect your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                    id="current-password"
                    name="current-password"
                    type="password"
                    autoComplete="current-password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    name="new-password"
                    type="password"
                    autoComplete="new-password"
                  />
                </div>
                <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="two-factor-authentication">
                      Two-factor authentication
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Require a verification code when signing in.
                    </p>
                  </div>
                  <Switch
                    id="two-factor-authentication"
                    name="two-factor-authentication"
                    defaultChecked
                    aria-label="Two-factor authentication"
                  />
                </div>
              </CardContent>
              <CardFooter className="justify-between gap-3 border-t">
                <Button type="button" variant="outline">
                  Review sessions
                </Button>
                <Button type="button">Save security settings</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  )
}
