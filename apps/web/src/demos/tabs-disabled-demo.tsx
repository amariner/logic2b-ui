import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/ui/tabs"

export default function TabsDisabledDemo() {
  return (
    <Tabs defaultValue="active" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="archived">Archived</TabsTrigger>
        <TabsTrigger value="deleted" disabled>
          Deleted
        </TabsTrigger>
      </TabsList>
      <TabsContent value="active" className="text-muted-foreground pt-2 text-sm">
        Items you are currently working on.
      </TabsContent>
      <TabsContent
        value="archived"
        className="text-muted-foreground pt-2 text-sm"
      >
        Items you have archived for later.
      </TabsContent>
    </Tabs>
  )
}
