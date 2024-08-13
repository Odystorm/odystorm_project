import { Head } from '@inertiajs/react'
import { ToastContainer, toast } from 'react-toastify'
import { Link } from '@inertiajs/react'

const options = [
  {
    text: 'Broadcast',
    url: '/admin/broadcast',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 14 14"
      >
        <g
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M13.5 9A6 6 0 0 1 5 .5ZM9.26 4.74L12 2" />
          <path d="M3.96 7.57L.5 13.5H7L5.92 9.73" />
        </g>
      </svg>
    ),
  },
  {
    text: 'Task Manager',
    url: '/admin/task-manager',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
      >
        <path
          fill="currentColor"
          d="M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2q1.625 0 3.075.475T17.75 3.8L16.3 5.275q-.95-.6-2.025-.937T12 4Q8.675 4 6.337 6.338T4 12t2.338 5.663T12 20t5.663-2.337T20 12q0-.45-.05-.9t-.15-.875L21.425 8.6q.275.8.425 1.65T22 12q0 2.075-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m-1.4-5.4l-4.25-4.25l1.4-1.4l2.85 2.85l10-10.025l1.4 1.4z"
        />
      </svg>
    ),
  },
  {
    text: 'User Management',
    url: '',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
      >
        <path
          fill="currentColor"
          d="M17 17q.625 0 1.063-.437T18.5 15.5t-.437-1.062T17 14t-1.062.438T15.5 15.5t.438 1.063T17 17m0 3q.775 0 1.425-.363t1.05-.962q-.55-.325-1.175-.5T17 18t-1.3.175t-1.175.5q.4.6 1.05.963T17 20m0 2q-2.075 0-3.537-1.463T12 17t1.463-3.537T17 12t3.538 1.463T22 17t-1.463 3.538T17 22m-5 0q-3.475-.875-5.738-3.988T4 11.1V5l8-3l8 3v5.675q-.65-.325-1.463-.5T17 10q-2.9 0-4.95 2.05T10 17q0 1.55.588 2.8t1.487 2.175q-.025 0-.037.013T12 22"
        />
      </svg>
    ),
  },
  {
    text: 'View Metrics',
    url: '',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 1024 1024"
      >
        <path
          fill="currentColor"
          d="M128 896V128h768v768zm291.712-327.296l128 102.4l180.16-201.792l-47.744-42.624l-139.84 156.608l-128-102.4l-180.16 201.792l47.744 42.624zM816 352a48 48 0 1 0-96 0a48 48 0 0 0 96 0"
        />
      </svg>
    ),
  },
]
export default function Admin() {

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
              d="m12 13.4l-4.9 4.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7l4.9-4.9l-4.9-4.9q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.9 4.9l4.9-4.9q.275-.275.7-.275t.7.275t.275.7t-.275.7L13.4 12l4.9 4.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275z"
            />
          </svg>
        </button>
        <h3 className="font-orbitron text-3xl font-bold text-white">
          Admin Functions
        </h3>
        <div className="grid grid-cols-2 gap-2 p-2">
          {options.map((option, index) => {
            if (option.url !== '') {
              return (
                <Link
                  href={option.url}
                  key={index}
                  className="inline-flex h-16 items-center justify-center gap-x-1 rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 p-3 text-center font-orbitron text-lg font-semibold text-white shadow-2xl shadow-blue-500"
                >
                  {option.icon}
                  {option.text}
                </Link>
              )
            }

            return (
              <button
                onClick={() => {
                  toast('Feature in Development')
                }}
                key={index}
                className="inline-flex h-16 items-center justify-center gap-x-1 rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 p-3 text-center font-orbitron text-lg font-semibold text-white shadow-2xl shadow-blue-500"
              >
                {option.icon}
                {option.text}
              </button>
            )
          })}
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
