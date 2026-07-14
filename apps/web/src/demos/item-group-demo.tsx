import { BellIcon, CreditCardIcon, ShieldIcon } from "lucide-react"

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/registry/ui/item"
import { Switch } from "@/registry/ui/switch"

export default function ItemGroupDemo() {
  return (
    <ItemGroup className="w-full max-w-md gap-0 divide-y rounded-md border">
      <Item>
        <ItemMedia variant="icon">
          <BellIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Notifications</ItemTitle>
          <ItemDescription>Get notified about account activity.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Switch defaultChecked />
        </ItemActions>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemMedia variant="icon">
          <ShieldIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Two-factor authentication</ItemTitle>
          <ItemDescription>Require a code at every sign-in.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Switch />
        </ItemActions>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemMedia variant="icon">
          <CreditCardIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Billing alerts</ItemTitle>
          <ItemDescription>Email me before a renewal charge.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Switch defaultChecked />
        </ItemActions>
      </Item>
    </ItemGroup>
  )
}
