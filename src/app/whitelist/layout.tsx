import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'A-List Plus Whitelist - Premium Access',
  description: 'Request premium access to A-List ELAN Hub and enjoy exclusive features',
}

export default function WhitelistLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}