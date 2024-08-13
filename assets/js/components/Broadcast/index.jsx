import { useState } from 'react'
import { toast } from 'react-toastify'
import axios from 'axios'
import { Puff } from 'react-loader-spinner'

const options = ['Image Broadcast', 'Text Broadcast', 'Video Broadcast']

export default function Broadcast() {
  const [formData, setFormData] = useState({
    photoUrl: '',
    videoUrl: '',
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
        {selectedOption === 'Video Broadcast' ? (
          <div>
            <input
              type="url"
              className="h-16 w-full rounded-md border-2 border-blue-500 bg-transparent p-2 font-bold text-white"
              id="videoUrl"
              placeholder="Video URL"
              onChange={handleChange}
              required
              value={formData.videoUrl}
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
            rows={10}
            required
            value={formData.message}
            placeholder="Message"
          ></textarea>
        </div>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-x-3 rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 p-3 font-orbitron text-lg font-semibold text-white shadow-2xl shadow-blue-500"
        >
          {loading ? <Puff color="#fff" width={30} height={30} /> : 'Submit'}
        </button>
      </form>
    </div>
  )
}
