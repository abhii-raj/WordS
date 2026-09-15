import RoomHeader from './RoomHeader'
import TargetWords from './TargetWords'
import WordGrid from './WordGrid'
import Scoreboard from './Scoreboard'
import ChatBox from './ChatBox'

const Play = ({
  code,
  copyRoomCode,
  connectionStatus = 'connected',
  memoWords = [],
  found = new Set(),
  scores = [],
  isHost,
  resetGame,
  isLoading,
  finalizeGame,
  memoGrid = [],
  foundPaths = [],
  onWordSelected,
  chatMessages = [],
  onSendMessage,
  userId
}) => {
  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start w-full max-w-7xl mx-auto py-2">
      {/* Left Column: Room Code, Target Words, and Scoreboard */}
      <div className="w-full lg:w-80 shrink-0 space-y-4">
        <RoomHeader
          code={code}
          connectionStatus={connectionStatus}
          onCopy={copyRoomCode}
        />

        <TargetWords
          targetWords={memoWords}
          found={found}
        />

        <Scoreboard
          scores={scores}
          isHost={isHost}
          isLoading={isLoading}
          connectionStatus={connectionStatus}
          onResetGame={resetGame}
          onFinalizeGame={finalizeGame}
        />
      </div>

      {/* Center Column: Word Search Matrix */}
      <div className="flex-1 w-full flex flex-col items-center justify-center">
        <WordGrid
          grid={memoGrid}
          targetWords={memoWords}
          found={found}
          foundPaths={foundPaths}
          onWordSelected={onWordSelected}
        />
      </div>

      {/* Right Column: Chat Box */}
      <div className="w-full lg:w-80 shrink-0">
        <ChatBox
          chatMessages={chatMessages}
          onSendMessage={onSendMessage}
          connectionStatus={connectionStatus}
          currentUserId={userId}
          className="h-[520px]"
        />
      </div>
    </div>
  )
}

export default Play