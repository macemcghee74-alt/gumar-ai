import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gunmar",
  description: "A cloud-first personal AI companion."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
