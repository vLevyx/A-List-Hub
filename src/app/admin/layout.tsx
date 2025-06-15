import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Dashboard - A-List ELAN Hub',
  description: 'Admin dashboard for managing users and viewing analytics',
}

export default function AdminLayout({
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