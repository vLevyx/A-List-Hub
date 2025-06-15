import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Price Planner - A-List ELAN Hub',
  description: 'Estimate item value through raw material analysis for ELAN Life.',
}

export default function PricePlannerLayout({
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