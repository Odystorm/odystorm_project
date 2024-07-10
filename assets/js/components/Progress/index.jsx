const ProgressBar = ({ progress }) => {
  return (
    <div className="h-6 w-full overflow-hidden rounded-full bg-gray-200 shadow-2xl">
      <div
        className="h-full transition-all duration-500 ease-in-out"
        style={{
          width: `${progress}%`,
          background: 'linear-gradient(to right, #AF955D, #cea650, #a38035)',
        }}
      ></div>
    </div>
  )
}

export default ProgressBar
