import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - A-List ELAN Hub',
  description: 'Privacy policy and data protection information for A-List ELAN Hub',
}

export default function PrivacyLayout({
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