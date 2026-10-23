// Stroke icon paths copied from the design (24x24 viewBox).
export const ICONS = {
  home: "M3 11l9-8 9 8v9H3z",
  homeSolid: "M3 11l9-8 9 8v9a1 1 0 01-1 1H4a1 1 0 01-1-1z",
  cases: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6",
  patients: "M16 20v-2a4 4 0 00-8 0v2M12 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7z",
  messages: "M4 5h16v11H9l-5 4z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  bell: "M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4",
  profile: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  clinic: "M4 21V8l8-5 8 5v13M9 21v-6h6v6",
  menu: "M4 7h16M4 12h16M4 17h16",
  back: "M15 5l-7 7 7 7",
  chevronDown: "M6 9l6 6 6-6",
  check: "M5 12l5 5 9-10",
  edit: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
  copy: "M9 9h11v11H9zM5 15V4h11",
  share: "M4 12v7h16v-7M12 3v12M8 7l4-4 4 4",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
  more: "M5 12a1 1 0 102 0 1 1 0 10-2 0M11 12a1 1 0 102 0 1 1 0 10-2 0M17 12a1 1 0 102 0 1 1 0 10-2 0",
  lock: "M6 11h12v9H6zM8 11V8a4 4 0 018 0v3",
} as const;

export function Icon({ name, size = 20, className }: { name: keyof typeof ICONS; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={[name === "back" ? "directional-icon" : "", className ?? ""].join(" ")} aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}
