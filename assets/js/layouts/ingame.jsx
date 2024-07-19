import { Head } from '@inertiajs/react'
// import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'

export const GameLayout = ({ children, component, setComponent }) => {
  return (
    <>
      <Head title="Play OdyStorm Token Farm" />
      <section className="relative max-h-screen min-h-screen w-full overflow-hidden bg-black">
        {/* <TopNav 
        /> */}
        <img
          src="/images/bg/bg_space.webp"
          alt=""
          className="absolute left-0 top-0 h-screen object-cover brightness-[0.45]"
        />
        <main className="z-50 min-w-full">{children}</main>
        <BottomNav component={component} setComponent={setComponent} />
      </section>
    </>
  )
}

export default GameLayout
