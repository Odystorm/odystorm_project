import { Head } from '@inertiajs/react'
import BottomNav from '@/components/BottomNav'

export const GameLayout = ({ children, component, setComponent }) => {
  return (
    <section className="flex min-h-[100dvh] flex-col items-center justify-between gap-y-3  bg-space container">
      <Head title="Play OdyStorm Token Farm" />
      <div className="relative flex w-full min-h-full overflow-hidden">
        {children}
      </div>
      <BottomNav component={component} setComponent={setComponent} />
    </section>
  )
}

export default GameLayout
