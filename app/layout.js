import './globals.css';

export const metadata = { title: 'License registry', robots: 'noindex' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
