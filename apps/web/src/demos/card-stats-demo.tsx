import { Badge } from "@/registry/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card"

export default function CardStatsDemo() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardDescription>Total revenue</CardDescription>
        <CardTitle className="text-2xl">$45,231.89</CardTitle>
        <CardAction>
          <Badge variant="secondary">+12.5%</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Trending up compared to last month.
        </p>
      </CardContent>
    </Card>
  )
}
