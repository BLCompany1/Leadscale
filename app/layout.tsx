import './globals.css'

export const metadata = {
  title: 'Dashboard de Performance',
  description: 'Gerenciamento de Meta Ads',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-br">
      {/* O atributo abaixo ignora atributos extras injetados por extensões */}
      <body className="bg-[#0a051a]" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  )
}