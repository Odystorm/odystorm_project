import { Head } from '@inertiajs/react'
import BottomNav from '@/components/BottomNav'

export const GameLayout = ({ children, component, setComponent }) => {
  return (
    <section className="container flex min-h-[100dvh] flex-col items-center justify-between gap-y-3 bg-space">
      <Head title="Play OdyStorm Token Farm" />
      <div className="relative flex h-full w-full flex-col">{children}</div>
      <BottomNav component={component} setComponent={setComponent} />
    </section>
  )
}

export default GameLayout
