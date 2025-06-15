import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Authentication Error</h1>
          <p className="text-white/70 mb-6">
            Sorry, we couldn't complete your login. This might be due to an expired or invalid authentication code.
          </p>
          <Link href="/">
            <Button variant="default">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}