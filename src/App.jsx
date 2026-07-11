// =============================================
// App.jsx — Main App: Router + State
// =============================================
// This is the heart of the app.
// It holds the entire game state and decides
// which screen to show based on gameState.phase.
//
// HOW NAVIGATION WORKS:
// - There is NO React Router here.
// - Instead we use a single 'phase' string in
//   gameState to decide which screen renders.
// - To go to a new screen: call setGameState
//   with the new phase value.
//
// EXAMPLE — going from Start to Starter screen:
//   setGameState(prev => ({
//     ...prev,
//     trainerName: 'Ash',
//     generation: 1,
//     phase: PHASES.STARTER,
//   }))

import { useState } from 'react'
import { PHASES, INITIAL_STATE } from './state/gameState'

// Screens — Prakhar will build these out
import StartScreen from './screens/StartScreen'
import StarterScreen from './screens/StarterScreen'
import TeamPreviewScreen from './screens/TeamPreviewScreen'
import BattleScreen from './screens/BattleScreen'
import RoundSummaryScreen from './screens/RoundSummaryScreen'
import EvolutionScreen from './screens/EvolutionScreen'
import WinScreen from './screens/WinScreen'
import LoseScreen from './screens/LoseScreen'

export default function App() {
  const [gameState, setGameState] = useState(INITIAL_STATE)

  // Render the correct screen based on current phase
  const renderScreen = () => {
    switch (gameState.phase) {

      case PHASES.START:
        return (
          <StartScreen
            gameState={gameState}
            setGameState={setGameState}
          />
        )

      case PHASES.STARTER:
        return (
          <StarterScreen
            gameState={gameState}
            setGameState={setGameState}
          />
        )

      case PHASES.TEAM_PREVIEW:
        return (
          <TeamPreviewScreen
            gameState={gameState}
            setGameState={setGameState}
          />
        )

      case PHASES.BATTLE:
        return (
          <BattleScreen
            gameState={gameState}
            setGameState={setGameState}
          />
        )

      case PHASES.ROUND_SUMMARY:
        return (
          <RoundSummaryScreen
            gameState={gameState}
            setGameState={setGameState}
          />
        )

      case PHASES.EVOLUTION:
        return (
          <EvolutionScreen
            gameState={gameState}
            setGameState={setGameState}
          />
        )

      case PHASES.WIN:
        return (
          <WinScreen
            gameState={gameState}
            setGameState={setGameState}
          />
        )

      case PHASES.LOSE:
        return (
          <LoseScreen
            gameState={gameState}
            setGameState={setGameState}
          />
        )

      default:
        return <div>Unknown phase: {gameState.phase}</div>
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0B1B3A' }}>
      {renderScreen()}
    </div>
  )
}
