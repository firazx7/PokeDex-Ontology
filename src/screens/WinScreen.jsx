// =============================================
// WinScreen.jsx (FULLY BUILT)
// =============================================
import { INITIAL_STATE } from '../state/gameState'
import PokemonCard from '../components/PokemonCard'

export default function WinScreen({ gameState, setGameState }) {
  const again = () => setGameState(INITIAL_STATE)
  const survivors = gameState.team.filter(p => !p.fainted).length

  return (
    <div className="screen gap24">
      <h1 className="game-title" style={{ fontSize: 28 }}>YOU WIN!</h1>
      <p className="mono" style={{ fontSize: 24, color: '#fff' }}>
        Champion {gameState.trainerName} cleared all 10 rounds
      </p>
      <p className="pixel" style={{ fontSize: 10, color: '#58d858' }}>
        {survivors} / 6 POKEMON SURVIVED
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: '100%', maxWidth: 680 }}>
        {gameState.team.map((p, i) => <PokemonCard key={p.iri + i} pokemon={p} />)}
      </div>
      <button className="btn btn-primary" style={{ fontSize: 12, padding: '16px 30px' }} onClick={again}>
        PLAY AGAIN
      </button>
    </div>
  )
}
