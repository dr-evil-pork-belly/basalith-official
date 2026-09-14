// This route is a permanent redirect to /contact (see page.tsx). The layout
// carries no metadata so the retired "Become a Legacy Guide" title cannot
// surface anywhere. The whole directory can be deleted once the redirect has
// lived long enough for held links to expire.
export default function JoinArchivistsLayout({ children }: { children: React.ReactNode }) {
  return children
}
