import * as React from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/registry/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/registry/ui/form"
import { Input } from "@/registry/ui/input"

interface PlaygroundFormProps {
  placeholder: string
  description: string
  disabled: boolean
}

interface PlaygroundFormValues {
  username: string
}

export default function PlaygroundForm({
  placeholder,
  description,
  disabled,
}: PlaygroundFormProps) {
  const form = useForm<PlaygroundFormValues>({
    defaultValues: { username: "" },
  })
  const [savedUsername, setSavedUsername] = React.useState("")

  return (
    <Form {...form}>
      <form
        className="w-full max-w-sm space-y-6"
        onSubmit={form.handleSubmit(({ username }) => setSavedUsername(username))}
      >
        <FormField
          control={form.control}
          name="username"
          rules={{
            required: "Username is required.",
            minLength: {
              value: 2,
              message: "Username must be at least 2 characters.",
            },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={placeholder}
                  disabled={disabled}
                  autoComplete="username"
                />
              </FormControl>
              <FormDescription>{description}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={disabled}>Save profile</Button>
        {savedUsername ? (
          <p className="text-sm text-muted-foreground" role="status">
            Saved {savedUsername}.
          </p>
        ) : null}
      </form>
    </Form>
  )
}
