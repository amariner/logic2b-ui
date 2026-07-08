import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/registry/ui/navigation-menu"

// `viewport={false}` renders the dropdown panel directly beneath its own
// trigger instead of inside a shared, centered viewport.
export default function NavigationMenuInlineDemo() {
  return (
    <NavigationMenu viewport={false}>
      <NavigationMenuList className="!list-none [&_li]:!mt-0">
        <NavigationMenuItem>
          <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="!list-none grid w-56 gap-1 p-2 [&_li]:!mt-0">
              <li>
                <NavigationMenuLink href="/docs" className="!no-underline">
                  Introduction
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink
                  href="/docs/installation"
                  className="!no-underline"
                >
                  Installation
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
