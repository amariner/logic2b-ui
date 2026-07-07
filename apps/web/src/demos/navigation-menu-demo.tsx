import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/registry/ui/navigation-menu"

export default function NavigationMenuDemo() {
  return (
    <NavigationMenu>
      <NavigationMenuList className="!list-none [&_li]:!mt-0">
        <NavigationMenuItem>
          <NavigationMenuTrigger>Components</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="!list-none grid w-64 gap-1 p-2 [&_li]:!mt-0">
              <li>
                <NavigationMenuLink
                  href="/docs/components/button"
                  className="!no-underline"
                >
                  <div className="font-medium">Button</div>
                  <div className="text-muted-foreground">
                    Displays a button or a link that looks like one.
                  </div>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink
                  href="/docs/components/dialog"
                  className="!no-underline"
                >
                  <div className="font-medium">Dialog</div>
                  <div className="text-muted-foreground">
                    A modal window overlaid on the page.
                  </div>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="/docs" className="!no-underline">
            Docs
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
