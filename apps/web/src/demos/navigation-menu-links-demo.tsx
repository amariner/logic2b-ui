import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/registry/ui/navigation-menu"

export default function NavigationMenuLinksDemo() {
  return (
    <NavigationMenu>
      <NavigationMenuList className="!list-none [&_li]:!mt-0">
        <NavigationMenuItem>
          <NavigationMenuLink
            href="/docs"
            className={`${navigationMenuTriggerStyle()} !no-underline`}
          >
            Docs
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            href="/docs/components"
            className={`${navigationMenuTriggerStyle()} !no-underline`}
          >
            Components
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            href="/docs/components/button"
            className={`${navigationMenuTriggerStyle()} !no-underline`}
          >
            Button
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
