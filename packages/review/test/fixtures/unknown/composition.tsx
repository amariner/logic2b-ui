export const Example = ({ labels, props, value, hidden }) => <>
  <CustomLabel htmlFor="customer-name">Customer name</CustomLabel>
  {labels}
  <input id="customer-name" />
  <label {...props} />
  <button aria-hidden={hidden} />
  <input type="button" value={value} />
  <div className="text-red-500" {...props} />
  <div style={{ color: "red", ...props }} />
</>
