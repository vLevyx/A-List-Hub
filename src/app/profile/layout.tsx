import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your Profile - A-List ELAN Hub',
  description: 'Manage your profile and blueprint settings for ELAN Life',
}

export default function ProfileLayout({
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