import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Weapon Compatibility - A-List ELAN Hub',
  description: 'Comprehensive firearm specifications and attachment compatibility for ELAN Life',
}

export default function WeaponCompatibilityLayout({
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