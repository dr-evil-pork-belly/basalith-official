// Shared marketing copy constants. Centralized so the same string renders
// byte-identically across every B2B surface (homepage hero eyebrow, /succession
// eyebrow, etc). Do not inline this text elsewhere; import it.

// The category line. Used verbatim and identically on every B2B surface.
//
// October 20, 2026: was "Knowledge transfer when a business changes hands."
// A corporate reader filed that as enterprise knowledge software (search and
// wiki tools) before reading further, because "knowledge" is that category's
// own word. The line now names the person and the judgment. Record:
// docs/HOMEPAGE_CATEGORY_2026-10-20.md.
//
// October 23, 2026: "founder" became "owner." The buyer this line is for is
// the owner of a closely held business (a dealership, a distributor, a dental
// group), and many of them bought the company or inherited it. Record:
// docs/OWNER_BUYER_2026-10-23.md.
export const CATEGORY_LINE =
  "The owner's judgment, kept when a business changes hands. By acquisition or succession."
