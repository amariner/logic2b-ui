import { Alert, AlertDescription, AlertTitle } from "@/registry/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/ui/avatar"
import { Badge } from "@/registry/ui/badge"
import { Button } from "@/registry/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card"
import { Input } from "@/registry/ui/input"
import { Label } from "@/registry/ui/label"
import { Separator } from "@/registry/ui/separator"
import { Skeleton } from "@/registry/ui/skeleton"
import { Textarea } from "@/registry/ui/textarea"

export function HeroDemo() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Start building with logic2b ui.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" placeholder="Tell us about yourself" />
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button className="flex-1">Sign up</Button>
          <Button variant="outline">Cancel</Button>
        </CardFooter>
      </Card>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Buttons & badges</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Button size="sm">Default</Button>
            <Button size="sm" variant="secondary">
              Secondary
            </Button>
            <Button size="sm" variant="outline">
              Outline
            </Button>
            <Button size="sm" variant="destructive">
              Delete
            </Button>
            <Separator className="my-2" />
            <Badge>New</Badge>
            <Badge variant="secondary">Beta</Badge>
            <Badge variant="outline">v0.1</Badge>
            <Badge variant="destructive">Deprecated</Badge>
          </CardContent>
        </Card>
        <Alert>
          <AlertTitle>Heads up!</AlertTitle>
          <AlertDescription>
            Every component is copy-paste. You own the code.
          </AlertDescription>
        </Alert>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>People with access.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src="https://github.com/vercel.png" alt="@logic2b" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <p className="font-medium leading-none">logic2b</p>
                <p className="text-muted-foreground">Owner</p>
              </div>
              <Badge variant="outline" className="ml-auto">
                Admin
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>L2</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <p className="font-medium leading-none">logic2b</p>
                <p className="text-muted-foreground">Member</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="grid gap-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
