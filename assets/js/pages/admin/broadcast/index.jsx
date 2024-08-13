import { Head } from '@inertiajs/react'
import Broadcast from '@/components/Broadcast'

export default function BroadcastPage() {
  return (
    <>
      <Head title="OdyStorm Admin" />
      <section className="relative flex min-h-screen w-full flex-col items-center justify-center gap-y-5 bg-space pt-10">
        <button
          className="absolute right-5 top-5"
          onClick={() => window.history.back()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
          >
            <path
              fill="#fff"
              d="m10 18l-6-6l6-6l1.4 1.45L7.85 11H20v2H7.85l3.55 3.55z"
            />
          </svg>
        </button>
        <Broadcast />
      </section>
    </>
  )
}
