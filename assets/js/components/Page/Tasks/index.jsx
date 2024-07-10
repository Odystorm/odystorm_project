import React from 'react'
import { tasks } from '@/data/sample'

const Tasks = () => {
  return (
    <div className="max-h-screen w-full overflow-y-scroll">
      <div className="mt-5 flex flex-col items-center justify-center overflow-y-auto py-3">
        <img
          src="/images/logo/logo.svg"
          className="h-[90px] w-[90px] drop-shadow-lg"
          alt="OdyStorm Logo"
        />
        <div className="text-center">
          <h3 className=" text-3xl font-bold text-white">Tasks</h3>
          <p className="px-2 text-white/50">
            You'll be rewarded immediately with OdyStorm Tokens after each task
            completion.
          </p>
        </div>
        <div className="mb-[5rem] mt-5 w-full space-y-5 px-2">
          {tasks.map((task, index) => {
            const iconProps = { className: 'fill-white h-[40px] w-[40px]' }
            return (
              <React.Fragment key={index}>
                <div className="flex w-full flex-row justify-between gap-x-5 px-2 text-white">
                  <div className="flex items-center gap-x-5">
                    <div>{task.icon(iconProps)}</div>
                    <div className="flex flex-col gap-y-1 ">
                      <span className="text-md">{task.task}</span>
                      <span className="text-sm text-white/50">
                        +{task.rewardAmount} ODY
                      </span>
                    </div>
                  </div>
                  {!task.isCompleted ? (
                    <button className="rounded-full bg-white px-6 py-1 text-sm text-black hover:bg-gray-200 focus:outline-none active:bg-gray-300">
                      Start
                    </button>
                  ) : (
                    <button className="rounded-full bg-white px-6 py-1 text-sm text-black hover:bg-gray-200 focus:outline-none active:bg-gray-300">
                      Start
                    </button>
                  )}
                </div>
                {index < tasks.length - 1 && (
                  <hr className="my-5 border-t border-gray-500" />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Tasks
