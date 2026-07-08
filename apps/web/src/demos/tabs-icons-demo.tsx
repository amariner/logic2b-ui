import { BarChartIcon, SettingsIcon, UserIcon } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/ui/tabs"

export default function TabsIconsDemo() {
  return (
    <Tabs defaultValue="overview" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="overview">
          <BarChartIcon />
          Overview
        </TabsTrigger>
        <TabsTrigger value="account">
          <UserIcon />
          Account
        </TabsTrigger>
        <TabsTrigger value="settings">
          <SettingsIcon />
          Settings
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="text-muted-foreground pt-2 text-sm">
        View your activity at a glance.
      </TabsContent>
      <TabsContent value="account" className="text-muted-foreground pt-2 text-sm">
        Manage your account details.
      </TabsContent>
      <TabsContent value="settings" className="text-muted-foreground pt-2 text-sm">
        Configure your preferences.
      </TabsContent>
    </Tabs>
  )
}
