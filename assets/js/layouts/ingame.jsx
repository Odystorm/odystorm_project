import { Head } from '@inertiajs/react'
import BottomNav from '@/components/BottomNav'

export const GameLayout = ({ children, component, setComponent }) => {
  return (
    <>
      <Head title="Play OdyStorm Token Farm" />
      <section className="relative max-h-[100dvh] min-h-[100dvh] w-full overflow-hidden flex flex-col items-center justify-between bg-space">
        <main className="min-w-full max-h-fit border">{children}</main>
        <BottomNav component={component} setComponent={setComponent} />
      </section>
    </>
  )
}

export default GameLayout
