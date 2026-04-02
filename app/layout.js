export const metadata = {
  title: 'Memo — Decentralized Research Agent',
  description: 'Multi-agent research system with persistent memory on 0G Network',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'monospace' }}>
        {children}
      </body>
    </html>
  );
}