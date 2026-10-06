import type { CSSProperties } from "react";
export default function StudioIcon({
  name,
  size = 20,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  const paths: Record<string, React.ReactNode> = {
    brush: (
      <>
        <path d="M14 3 6 15l3 3L21 6Z" />
        <path d="m12 6 6 6M6 15C2 15 3 20 2 22c3 0 8-1 7-4" />
      </>
    ),
    home: (
      <>
        <path d="m3 10 9-7 9 7v10H3Z" />
        <path d="M9 20v-7h6v7" />
      </>
    ),
    palette: (
      <>
        <path d="M12 3a9 9 0 1 0 0 18h1.3a2.3 2.3 0 0 0 1.4-4.1 1.5 1.5 0 0 1 1-2.7H18A4 4 0 0 0 22 10c-.8-4-5-7-10-7Z" />
        <circle cx="7" cy="10" r=".8" />
        <circle cx="11" cy="7" r=".8" />
        <circle cx="16" cy="8" r=".8" />
      </>
    ),
    pencil: (
      <>
        <path d="m4 16-1 5 5-1L21 7l-4-4Z" />
        <path d="m14 6 4 4M4 16l4 4" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8" cy="8" r="1.5" />
        <path d="m3 17 5-5 4 4 3-3 6 6" />
      </>
    ),
    layers: (
      <>
        <path d="m3 8 9-5 9 5-9 5ZM3 12l9 5 9-5M3 16l9 5 9-5" />
      </>
    ),
    arrow: (
      <>
        <path d="M4 12h16m-6-6 6 6-6 6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    book: (
      <>
        <path d="M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-4-2-7-1-10 1Z" />
        <path d="M12 5v15" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name] || paths.book}
    </svg>
  );
}
