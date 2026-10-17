import type { Metadata } from "next";
import "./styles.css";
import { StoreShell } from "./components/store-shell";

export const metadata: Metadata = {
  title: "OrderFlow — Shop the things you love",
  description: "Thoughtful finds for everyday living, delivered with care.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><StoreShell>{children}</StoreShell></body></html>;
}

