// Pass-through. The client gate that lived here belonged to the retired vault
// product; every page under this group is now a redirect, so there is nothing
// left to gate. Delete this group once the redirects have lived a few months.
export default function RetiredGroupLayout({ children }: { children: React.ReactNode }) {
  return children
}
