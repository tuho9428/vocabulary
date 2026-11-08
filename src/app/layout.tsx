import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cùng bạn học · Mỗi ngày một chút",
  description:
    "Học từ vựng tiếng Anh về quốc tịch Hoa Kỳ, nhẹ nhàng từng ngày. Dành cho người Việt lớn tuổi.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Browser extensions can add root attributes before React hydrates.
    // Limit suppression to this element; application content is still checked.
    <html lang="vi" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
