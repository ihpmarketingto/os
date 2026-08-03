/**
 * Bare layout for printable documents. No sidebar, no top bar, nothing that
 * would land in a client's PDF. Auth still applies because each page calls
 * requireSession itself.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white">{children}</div>;
}
