/**
 * Screens for things the client has not decided yet are built as preview-only UI: they use local sample data,
 * save nothing, and carry a "Pending client decision" tag. Set NEXT_PUBLIC_SHOW_PENDING=false to hide them all.
 */
export const SHOW_PENDING = process.env.NEXT_PUBLIC_SHOW_PENDING !== "false";
