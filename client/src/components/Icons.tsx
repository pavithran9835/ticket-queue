import type { SVGProps } from "react";
import type { TicketPriority } from "../api/types";

/** Small inline SVG icons (no icon-font or extra dependency). All decorative: aria-hidden. */
const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  "aria-hidden": true,
  focusable: false,
  ...props,
});

export const SearchIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const TicketIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="currentColor" />
    <path d="M5 8.2 7 10l4-4.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ListIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5.5 4h8M5.5 8h8M5.5 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="2.5" cy="4" r="1" fill="currentColor" />
    <circle cx="2.5" cy="8" r="1" fill="currentColor" />
    <circle cx="2.5" cy="12" r="1" fill="currentColor" />
  </svg>
);

export const ChevronLeft = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ErrorIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 20, height: 20, viewBox: "0 0 20 20", ...p })}>
    <circle cx="10" cy="10" r="8.5" fill="currentColor" />
    <path d="M10 5.5v5.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <circle cx="10" cy="14.2" r="1.2" fill="#fff" />
  </svg>
);

export const WarningIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 20, height: 20, viewBox: "0 0 20 20", ...p })}>
    <path d="M10 1.8 19 17.5H1L10 1.8Z" fill="currentColor" strokeLinejoin="round" />
    <path d="M10 7.5v4.5" stroke="#172b4d" strokeWidth="2" strokeLinecap="round" />
    <circle cx="10" cy="14.6" r="1.1" fill="#172b4d" />
  </svg>
);

export const SuccessIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 20, height: 20, viewBox: "0 0 20 20", ...p })}>
    <circle cx="10" cy="10" r="8.5" fill="currentColor" />
    <path d="m6 10.3 2.7 2.7L14 7.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const EmptyIllustration = () => (
  <svg width="96" height="80" viewBox="0 0 96 80" fill="none" aria-hidden focusable={false}>
    <rect x="14" y="10" width="56" height="64" rx="6" fill="#e9f2ff" stroke="#85b8ff" strokeWidth="2" />
    <path d="M26 28h32M26 40h24M26 52h28" stroke="#85b8ff" strokeWidth="3" strokeLinecap="round" />
    <circle cx="70" cy="52" r="14" fill="#fff" stroke="#0c66e4" strokeWidth="3" />
    <path d="m80 62 9 9" stroke="#0c66e4" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

/** Arrow/bar glyph per priority, coloured by severity. */
export function PriorityIcon({ priority }: { priority: TicketPriority }) {
  const color = { critical: "#c9372c", high: "#e56910", medium: "#cf9f02", low: "#1d7afc" }[priority];
  return (
    <svg {...base({ color })} className="priority-icon">
      {priority === "critical" && (
        <path d="M3.5 8.5 8 4l4.5 4.5M3.5 12.5 8 8l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {priority === "high" && (
        <path d="M3.5 10.5 8 6l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {priority === "medium" && <path d="M3 6h10M3 10h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
      {priority === "low" && (
        <path d="M3.5 5.5 8 10l4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
