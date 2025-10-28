import { Provider } from "@/app/providers";

export const metadata = {
  title: "Digital Asset Management System",
  description: "Scalable DAM system for Visual AI applications",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}