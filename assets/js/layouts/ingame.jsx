import { Head } from '@inertiajs/react'
// import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'

export const GameLayout = ({ children, component, setComponent }) => {
  return (
    <>
      <Head title="Play OdyStorm Token Farm" />
      <section className="relative max-h-screen min-h-screen w-full flex-col overflow-hidden bg-black">
        {/* <img
          src="/images/bg/forest.jpg"
          className="max-h-screen min-h-full min-w-full brightness-[0.20] absolute z-0"
        /> */}
        <main className="z-50 min-w-full">{children}</main>
        <BottomNav component={component} setComponent={setComponent} />
      </section>
    </>
  )
}

export default GameLayout
