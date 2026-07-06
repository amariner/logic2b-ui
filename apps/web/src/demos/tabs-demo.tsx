import { Button } from "@/registry/ui/button"
import { Input } from "@/registry/ui/input"
import { Label } from "@/registry/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/ui/tabs"

export default function TabsDemo() {
  return (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account" className="space-y-4 pt-2">
        <div className="grid gap-3">
          <Label htmlFor="tabs-name">Name</Label>
          <Input id="tabs-name" defaultValue="Pedro Duarte" />
        </div>
        <Button>Save changes</Button>
      </TabsContent>
      <TabsContent value="password" className="space-y-4 pt-2">
        <div className="grid gap-3">
          <Label htmlFor="tabs-password">Password</Label>
          <Input id="tabs-password" type="password" />
        </div>
        <Button>Save password</Button>
      </TabsContent>
    </Tabs>
  )
}
