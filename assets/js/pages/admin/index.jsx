import { useState } from 'react'
import { Head } from '@inertiajs/react'
import { toast, ToastContainer } from 'react-toastify'
import axios from 'axios'
import { Puff } from 'react-loader-spinner'

const options = ['Image Broadcast', 'Text Broadcast']
export default function Admin() {
  const [formData, setFormData] = useState({
    photoUrl: '',
    message: '',
  })
  const [selectedOption, setSelectedOption] = useState(options[0])
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    const { id, value } = e.target
    setFormData((formData) => ({ ...formData, [id]: value }))
  }

  function handleSelect(e) {
    setSelectedOption(e.target.value)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post(`/api/v1/admin/mass/message`, formData)
      setFormData((formData) => ({ ...formData, photoUrl: '', message: '' }))
      toast('Successfully Delivered Broadcast')
    } catch (error) {
      console.error(error)
      toast('There was a problem delivering the message please try again later')
    } finally {
      setFormData((formData) => ({ ...formData, photoUrl: '', message: '' }))
      setLoading(false)
    }
  }

  return (
    <>
      <Head title="OdyStorm Admin" />
      <section className="relative flex min-h-screen w-full items-start justify-center bg-space pt-10">
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
        <div className="mt-10 w-full space-y-3 p-3">
          <img
            src="/images/logo/logo.svg"
            className="animate mx-auto h-[100px] w-[100px]"
            alt=""
          />
          <div className="flex w-full items-center justify-center gap-x-3 rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 p-3 font-orbitron text-lg font-semibold text-white shadow-2xl shadow-blue-500">
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
            Broadcast
          </div>
          <form className="space-y-3 font-orbitron" onSubmit={handleSubmit}>
            <div>
              <select
                name=""
                className="h-16 w-full rounded-md border-2 border-blue-500 bg-transparent font-bold text-white"
                id=""
                onChange={(e) => handleSelect(e)} // Use onChange instead of onSelect
              >
                {options.map((option, index) => {
                  return (
                    <option
                      value={option}
                      key={index}
                      className="bg-gradient-to-r from-cyan-400 to-blue-500 text-blue-500"
                    >
                      {option}
                    </option>
                  )
                })}
              </select>
            </div>
            {selectedOption === 'Image Broadcast' ? (
              <div>
                <input
                  type="url"
                  className="h-16 w-full rounded-md border-2 border-blue-500 bg-transparent p-2 font-bold text-white"
                  id="photoUrl"
                  placeholder="Photo URL"
                  onChange={handleChange}
                  required
                  value={formData.photoUrl}
                />
              </div>
            ) : (
              ''
            )}
            <div>
              <textarea
                id="message"
                className="w-full rounded-md border-2 border-blue-500 bg-transparent p-2 text-white"
                onChange={handleChange}
                rows="10"
                required
                value={formData.message}
                placeholder="Message"
              ></textarea>
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-x-3 rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 p-3 font-orbitron text-lg font-semibold text-white shadow-2xl shadow-blue-500"
            >
              {loading ? (
                <Puff color="#fff" width={30} height={30} />
              ) : (
                'Submit'
              )}
            </button>
          </form>
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
