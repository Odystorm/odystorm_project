import { Head } from '@inertiajs/react'
import TaskManager from '@/components/TaskManager'
import { ToastContainer } from 'react-toastify'

export default function TaskManagerPage() {
  return (
    <>
      <Head title="OdyStorm Admin" />
      <section className="relative flex min-h-screen w-full flex-col items-center justify-start gap-y-5 bg-space pt-10">
        <button
          className="absolute left-5 top-5"
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
        <div className="w-full pt-5">
          <TaskManager />
        </div>
      </section>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        className="shadow-blue-500 drop-shadow-2xl"
        toastClassName={() =>
          'relative flex items-center justify-between p-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-md'
        }
        bodyClassName={() =>
          'text-sm text-center flex-grow font-orbitron font-bold'
        }
        hideProgressBar={true}
        closeButton={false} // Hide the default close button
      />
    </>
  )
}
