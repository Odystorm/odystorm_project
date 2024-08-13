import { useState } from 'react'
import { Puff } from 'react-loader-spinner'
import { toast } from 'react-toastify'
import axios from 'axios'

const options = [
  {
    type: 'Mile Stone',
    value: 'milestone',
  },
  {
    type: 'Social Following',
    value: 'social_following',
  },
  {
    type: 'Specific Task',
    value: 'ody_tasks',
  },
]
export default function TaskManager() {
  const [loading, setLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState('milestone')
  const [formData, setFormData] = useState({
    title: '',
    rewardAmount: 0,
    taskType: selectedOption,
    url: '',
    icon: '',
    instruction: '',
  })

  function handleChange(e) {
    const { value, id } = e.target
    setFormData((formData) => ({ ...formData, [id]: value }))
  }
  
  function clearInput(){
    setFormData((formData) => ({
      ...formData,
      title: '',
      rewardAmount: 0,
      taskType: selectedOption,
      url: '',
      icon: '',
      instruction: '',
    }))
  }

  async function handleSubmit(e) {
    setLoading(true)
    e.preventDefault()
    try {
      await axios.post('/admin/create-task', formData)

      toast('Successfully Added New Task')
    } catch (error) {
      console.error(error)
      if (error && error.response.data) {
        toast(error.response.data.message)
        return
      }

      if (error && !error.response) {
        toast('Network issues detected! Please Try Again Later')
      }
    } finally {
      setLoading(false)
      clearInput()
    }
  }

  function handleSelect(e) {
    setSelectedOption(e.target.value)
    setFormData((formData) => ({ ...formData, taskType: e.target.value }))
  }

  return (
    <div className="mt-10 w-full space-y-3 p-3">
      <div className="flex w-full items-center justify-center gap-x-3 rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 p-3 font-orbitron text-lg font-semibold text-white shadow-2xl shadow-blue-500">
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
        Add New Task
      </div>
      <form onSubmit={handleSubmit} className="space-y-3 ">
        <div className="space-y-2">
          <label htmlFor="title" className="text-md font-orbitron text-white">
            Task Title
          </label>
          <input
            type="text"
            className="h-16 w-full rounded-md border-2 border-blue-500 bg-transparent p-2 font-bold text-white"
            id="title"
            onChange={handleChange}
            required
            value={formData.title}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="rewardAmount"
            className="text-md font-orbitron text-white"
          >
            Reward Amount
          </label>
          <input
            type="number"
            className="h-16 w-full rounded-md border-2 border-blue-500 bg-transparent p-2 font-bold text-white"
            id="rewardAmount"
            min={5000}
            onChange={handleChange}
            required
            value={formData.rewardAmount}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="taskType"
            className="text-md font-orbitron text-white"
          >
            Task Type
          </label>
          <select
            name=""
            className="h-16 w-full rounded-md border-2 border-blue-500 bg-transparent font-bold text-white"
            id="taskType"
            onChange={(e) => handleSelect(e)} // Use onChange instead of onSelect
          >
            {options.map((option, index) => {
              return (
                <option
                  value={option.value}
                  key={index}
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 text-blue-500"
                >
                  {option.type}
                </option>
              )
            })}
          </select>
        </div>
        {selectedOption !== 'milestone' && (
          <div className="space-y-2">
            <label htmlFor="url" className="text-md font-orbitron text-white">
              URL
            </label>
            <input
              type="url"
              className="h-16 w-full rounded-md border-2 border-blue-500 bg-transparent p-2 font-bold text-white"
              id="url"
              onChange={handleChange}
              required
              value={formData.url}
            />
          </div>
        )}
        {selectedOption !== 'milestone' && (
          <div className="space-y-2">
            <label htmlFor="url" className="text-md font-orbitron text-white">
              Brand Image URL
            </label>
            <input
              type="text"
              className="h-16 w-full rounded-md border-2 border-blue-500 bg-transparent p-2 font-bold text-white"
              id="icon"
              onChange={handleChange}
              required
              value={formData.icon}
            />
          </div>
        )}
        {selectedOption === 'ody_tasks' && (
          <div className="space-y-2">
            <label
              htmlFor="instruction"
              className="text-md font-orbitron text-white"
            >
              Instructions
            </label>
            <textarea
              id="instruction"
              className="w-full rounded-md border-2 border-blue-500 bg-transparent p-2 text-white"
              onChange={handleChange}
              rows={5}
              required
              value={formData.instruction}
              placeholder="Message"
            ></textarea>
          </div>
        )}
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
