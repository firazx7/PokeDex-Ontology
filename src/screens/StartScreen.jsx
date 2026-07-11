// =============================================
// StartScreen.jsx — Start Screen
// =============================================
// WHAT THIS SCREEN DOES:
// 1. Shows the game title
// 2. Player enters their trainer name
// 3. Player selects a generation (1, 2, or 3)
// 4. Player clicks Start → goes to StarterScreen
//
// NO SPARQL QUERIES needed on this screen.
// All data is just user input.
//
// WHEN DONE, transition to next screen like this:
//
//   setGameState(prev => ({
//     ...prev,
//     trainerName: name,       // string from input
//     generation: generation,  // number 1, 2, or 3
//     phase: PHASES.STARTER,
//   }))

import { useState } from 'react'
import { PHASES } from '../state/gameState'

export default function StartScreen({ gameState, setGameState }) {
  const [name, setName] = useState('')
  const [generation, setGeneration] = useState(null)

  const canStart = name.trim().length > 0 && generation !== null

  const handleStart = () => {
    if (!canStart) return
    setGameState(prev => ({
      ...prev,
      trainerName: name.trim(),
      generation,
      phase: PHASES.STARTER,
    }))
  }

  return (
    <div className="screen">
      <h1 style={{ fontFamily: "'Press Start 2P'", color: '#EE1515', fontSize: '32px', marginBottom: '8px' }}>
        POKEDEX
      </h1>
      <h2 style={{ fontFamily: "'Press Start 2P'", color: '#FFCB05', fontSize: '18px', marginBottom: '40px' }}>
        ROGUELIKE
      </h2>

      {/* TODO: Prakhar — build the full design here */}
      {/* This is just a minimal working placeholder */}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '400px' }}>
        
        {/* Name input */}
        <div>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
            Your name, trainer:
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter your name..."
            maxLength={20}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '2px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '16px',
            }}
          />
        </div>

        {/* Generation selection */}
        <div>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
            Choose your generation:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { num: 1, label: 'Gen 1', sub: 'Kanto' },
              { num: 2, label: 'Gen 2', sub: 'Johto' },
              { num: 3, label: 'Gen 3', sub: 'Hoenn' },
            ].map(gen => (
              <button
                key={gen.num}
                onClick={() => setGeneration(gen.num)}
                className="btn"
                style={{
                  flex: 1,
                  background: generation === gen.num ? '#2A75BB' : 'rgba(255,255,255,0.1)',
                  border: generation === gen.num ? '2px solid #FFCB05' : '2px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  padding: '12px 8px',
                }}
              >
                <div style={{ fontWeight: 700 }}>{gen.label}</div>
                <div style={{ fontSize: '11px', opacity: 0.7 }}>{gen.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          className={`btn ${canStart ? 'btn-primary' : 'btn-disabled'}`}
          style={{ marginTop: '8px', padding: '16px', fontSize: '18px', width: '100%' }}
        >
          START GAME
        </button>
      </div>
    </div>
  )
}
