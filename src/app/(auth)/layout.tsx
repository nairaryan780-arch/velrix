import Link from "next/link";
import { Wordmark } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <div className="aurora" />
      <header style={{ padding: "22px 24px" }}>
        <Link href="/">
          <Wordmark />
        </Link>
      </header>
      <main style={{ flex: 1, display: "grid", placeItems: "center", padding: "24px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>{children}</div>
      </main>
      <footer style={{ padding: "20px 24px", textAlign: "center" }} className="muted">
        <span style={{ fontSize: 13 }}>Velrix — turn every enquiry into a qualified opportunity.</span>
      </footer>
    </div>
  );
}
