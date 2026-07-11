// =============================================
// TeamPreviewScreen.jsx — TODO: Build This Screen
// =============================================
// See README.md for full instructions on what
// this screen needs to do, which SPARQL queries
// to use, and how to transition to the next screen.
//
// The README has step-by-step instructions for
// each screen with code examples.

import { PHASES } from '../state/gameState'
import { useSparql } from '../hooks/useSparql'
import { QUERIES } from '../hooks/queries'

export default function TeamPreviewScreen({ gameState, setGameState }) {
  return (
    <div className="screen">
      <h2 style={{ color: '#FFCB05' }}>TeamPreviewScreen</h2>
      <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '16px' }}>
        TODO: Build this screen. See README.md for instructions.
      </p>
      <pre style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '24px', maxWidth: '600px' }}>
        {JSON.stringify({ phase: gameState.phase, round: gameState.round, team: gameState.team?.length }, null, 2)}
      </pre>
    </div>
  )
}
