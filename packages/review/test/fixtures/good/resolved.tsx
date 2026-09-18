export const Example = () => <>
  <h2 id="customer-title" hidden>Edit customer</h2>
  <dialog aria-labelledby="customer-title" open />
  <label htmlFor="customer-name">Customer name</label>
  <input id="customer-name" />
  <button><span className="sr-only">Remove customer</span><svg aria-hidden="true" /></button>
  <div className="text-destructive" style={{ color: "hsl(var(--foreground))" }} />
</>
