export default function Farm({ user }) {
  return (
    <div className="flex h-screen max-h-screen w-full flex-col justify-between overflow-y-scroll">
      <div className="mt-10 flex w-full flex-col items-center justify-center gap-y-3 text-white">
        {!user?.profilePicture ? (
          <p className="flex h-[155px] w-[155px] items-center justify-center rounded-full bg-white text-4xl font-bold text-black">
            {user?.firstName[0]}
          </p>
        ) : (
          <img
            src={user?.profilePicture}
            className="h-[155px] w-[155px] rounded-full"
          />
        )}

        <p className=" text-xl font-semibold">
          {user?.username ? user?.username : 'johndoe'}
        </p>
        <p className="mt-5 flex items-center justify-center gap-x-3  text-3xl font-semibold">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 14 14"
          >
            <path
              fill="#FFF"
              fill-rule="evenodd"
              d="M5.75 7H1.327a.5.5 0 0 1-.384-.82l5-6A.5.5 0 0 1 6.41.007a.75.75 0 0 1 .84.745L7.249 9h6.25a.5.5 0 0 1 .468.676l-1.013 2.702A2.5 2.5 0 0 1 10.614 14H3.386a2.5 2.5 0 0 1-2.34-1.622L.031 9.676A.5.5 0 0 1 .5 9h5.25zm3.631-4.804a.5.5 0 0 0-.896.304v4a.5.5 0 0 0 .5.5h3.07a.5.5 0 0 0 .396-.804z"
              clip-rule="evenodd"
            />
          </svg>
          <span className="text-4xl">{user?.wallet[0].balance}</span>
        </p>
      </div>
      <div className="mb-[7.5rem] flex flex-col items-center justify-center gap-y-3 px-2">
        <div className="w-full rounded-md bg-white flex flex-col gap-y-2 items-center justify-center p-3">
          <img
            src="/images/logo/logo_black.svg"
            className="h-[90px] w-[90px] drop-shadow-lg"
            alt="Odysir Logo"
          />
          <div className="flex w-full justify-between">
            <h3 className="p-3 bg-black text-white rounded-md">Harvest Game</h3>
            <button className="rounded-md bg-black font-semibold text-white p-3">
              Play
            </button>
          </div>
        </div>
        <div className="w-full">
          <button className="h-[3.5rem] w-full rounded-md bg-white font-semibold text-black">
            Start Farming
          </button>
        </div>
      </div>
    </div>
  )
}
