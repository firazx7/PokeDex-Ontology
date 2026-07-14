// =============================================
// BattleScreen.jsx — GBA Battle Scene (FULLY BUILT)
// =============================================
// Authentic Gen-3 battle layout:
//   - opponent sprite top-right on a platform, HP box top-left
//   - player sprite bottom-left (back sprite), HP box bottom-right
//   - message box + move menu below the scene
//   - attack shake / flash / floating damage animations
//
// All battle logic lives in utils/battle.js. This file is
// presentation + orchestration only.

import { useEffect, useState, useRef } from 'react'
import {
  PHASES, parsePokemon, parseMove, getDifficulty, isTeamWiped,
  getSpriteUrl, getBackSpriteUrl,
} from '../state/gameState'
import { useSparql } from '../hooks/useSparql'
import { QUERIES } from '../hooks/queries'
import {
  getEffectiveness, calculateDamage, hasUsableMoves,
  chooseOpponentMove, resolveOpponentMoveType, STRUGGLE,
} from '../utils/battle'

import HPBox from '../components/HPBox'
import MoveButton from '../components/MoveButton'
import PokemonCard from '../components/PokemonCard'
import TypeBadge from '../components/TypeBadge'

const STEP = {
  LOADING: 'LOADING',
  CHOOSE_POKEMON: 'CHOOSE_POKEMON',
  CHOOSE_MOVE: 'CHOOSE_MOVE',
  ANIMATING: 'ANIMATING',
}

export default function BattleScreen({ gameState, setGameState }) {
  const { query } = useSparql()

  const [step, setStep] = useState(STEP.LOADING)
  const [opponent, setOpponent] = useState(null)
  const [team, setTeam] = useState(gameState.team)
  const [activeIndex, setActiveIndex] = useState(null)
  const [message, setMessage] = useState('')

  // animation flags
  const [oppHit, setOppHit] = useState(false)
  const [plyHit, setPlyHit] = useState(false)
  const [oppFaint, setOppFaint] = useState(false)
  const [dmgFloat, setDmgFloat] = useState(null) // { side:'opp'|'ply', value }

  const active = activeIndex !== null ? team[activeIndex] : null
  const isBoss = getDifficulty(gameState.round) === 'boss'

  // ── Load opponent ───────────────────────────────
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setStep(STEP.LOADING)
      const diff = getDifficulty(gameState.round)
      const q = diff === 'boss' ? QUERIES.getLegendaryBoss() : QUERIES.getOpponent(diff)
      const rows = await query(q)
      if (!rows.length || cancelled) return
      const opp = parsePokemon(rows[0])
      const moveRows = await query(QUERIES.getMoves(opp.iriShort))
      opp.moves = moveRows.map(parseMove)
      if (cancelled) return
      setOpponent(opp)
      setMessage(isBoss ? `The Legendary ${opp.name} blocks your path!` : `A wild ${opp.name} appeared!`)
      setStep(STEP.CHOOSE_POKEMON)
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.round])

  const wait = (ms) => new Promise(r => setTimeout(r, ms))

  const applyDamage = (arr, index, dmg) =>
    arr.map((p, i) => {
      if (i !== index) return p
      const hp = Math.max(0, p.currentHP - dmg)
      return { ...p, currentHP: hp, fainted: hp <= 0 }
    })

  const showDamage = (side, value) => {
    setDmgFloat({ side, value })
    setTimeout(() => setDmgFloat(null), 1000)
  }

  // ── Player picks a Pokemon ──────────────────────
  const choosePokemon = (i) => {
    if (team[i].fainted) return
    setActiveIndex(i)
    setMessage(`Go, ${team[i].name}!`)
    setStep(STEP.CHOOSE_MOVE)
  }

  // ── Player uses a move ──────────────────────────
  const useMove = async (move) => {
    if (step !== STEP.CHOOSE_MOVE || !active || !opponent) return
    setStep(STEP.ANIMATING)
    setMessage(`${active.name} used ${move.name}!`)

    const { multiplier, label } = await getEffectiveness(query, move.typeIRI, opponent.types)
    const dmg = calculateDamage(active, opponent, move.power, multiplier)

    // opponent takes the hit
    setOppHit(true); setTimeout(() => setOppHit(false), 400)
    showDamage('opp', dmg)
    await wait(250)

    const newTeam = team.map((p, i) =>
      i !== activeIndex ? p : {
        ...p,
        moves: p.moves.map(m => m.name === move.name ? { ...m, currentPP: Math.max(0, m.currentPP - 1) } : m),
      })
    const newHP = Math.max(0, opponent.currentHP - dmg)
    const newOpp = { ...opponent, currentHP: newHP, fainted: newHP <= 0 }

    setTeam(newTeam)
    setOpponent(newOpp)
    await wait(300)
    setMessage(effMsg(label))

    if (newOpp.fainted) {
      setOppFaint(true)
      await wait(700)
      endRound(newTeam, newOpp)
      return
    }
    await wait(700)
    await opponentTurn(newTeam, newOpp)
  }

  // ── Struggle ────────────────────────────────────
  const struggle = async () => {
    if (step !== STEP.CHOOSE_MOVE || !active || !opponent) return
    setStep(STEP.ANIMATING)
    setMessage(`${active.name} has no moves left and used Struggle!`)

    setOppHit(true); setTimeout(() => setOppHit(false), 400)
    showDamage('opp', STRUGGLE.damageToTarget)
    const newOppHP = Math.max(0, opponent.currentHP - STRUGGLE.damageToTarget)
    const newOpp = { ...opponent, currentHP: newOppHP, fainted: newOppHP <= 0 }

    let newTeam = applyDamage(team, activeIndex, STRUGGLE.recoilToSelf)
    setPlyHit(true); setTimeout(() => setPlyHit(false), 400)
    showDamage('ply', STRUGGLE.recoilToSelf)

    setTeam(newTeam); setOpponent(newOpp)
    await wait(700)

    if (newOpp.fainted) { setOppFaint(true); await wait(700); endRound(newTeam, newOpp); return }
    if (newTeam[activeIndex].fainted) { await wait(300); activeFainted(newTeam); return }
    await opponentTurn(newTeam, newOpp)
  }

  // ── Opponent AI turn ────────────────────────────
  const opponentTurn = async (workingTeam, workingOpp) => {
    const choice = await chooseOpponentMove(query, workingOpp, active.types)

    if (choice.kind === 'struggle') {
      setMessage(`${workingOpp.name} used Struggle!`)
      setPlyHit(true); setTimeout(() => setPlyHit(false), 400)
      showDamage('ply', STRUGGLE.damageToTarget)
      const nt = applyDamage(workingTeam, activeIndex, STRUGGLE.damageToTarget)
      setTeam(nt)
      await wait(800)
      finishOppTurn(nt)
      return
    }

    setMessage(`${workingOpp.name} used ${choice.move.name}!`)
    const moveTypeIRI = resolveOpponentMoveType(workingOpp.moves, choice.move.name)
    const { multiplier, label } = await getEffectiveness(query, moveTypeIRI, active.types)
    const dmg = calculateDamage(workingOpp, active, choice.move.power, multiplier)

    setPlyHit(true); setTimeout(() => setPlyHit(false), 400)
    showDamage('ply', dmg)
    await wait(250)

    const nt = applyDamage(workingTeam, activeIndex, dmg)
    setTeam(nt)
    await wait(300)
    setMessage(effMsg(label))
    await wait(700)
    finishOppTurn(nt)
  }

  const finishOppTurn = (workingTeam) => {
    if (workingTeam[activeIndex].fainted) activeFainted(workingTeam)
    else setStep(STEP.CHOOSE_MOVE)
  }

  const activeFainted = (workingTeam) => {
    setMessage(`${team[activeIndex].name} fainted!`)
    if (isTeamWiped(workingTeam)) {
      setGameState(prev => ({ ...prev, team: workingTeam, phase: PHASES.LOSE }))
      return
    }
    setActiveIndex(null)
    setStep(STEP.CHOOSE_POKEMON)
  }

  const endRound = (workingTeam, defeatedOpp) => {
    setGameState(prev => ({
      ...prev,
      team: workingTeam,
      currentOpponent: defeatedOpp,
      activeIndex,
      roundSummary: {
        round: prev.round,
        opponentName: defeatedOpp.name,
        opponentNum: defeatedOpp.nationalNum,
        wasBoss: isBoss,
      },
      phase: PHASES.ROUND_SUMMARY,
    }))
  }

  // ── Render ──────────────────────────────────────
  if (step === STEP.LOADING || !opponent) {
    return (
      <div className="screen">
        <div className="round-pill" style={{ marginBottom: 20 }}>ROUND {gameState.round} / 10</div>
        <p className="blink pixel" style={{ fontSize: 12, color: '#cdd7ee' }}>
          {isBoss ? 'A LEGENDARY APPROACHES...' : 'searching for an opponent...'}
        </p>
      </div>
    )
  }

  return (
    <div className="screen" style={{ justifyContent: 'flex-start', paddingTop: 20, gap: 0 }}>

      {/* Round pill */}
      <div className="round-pill" style={{ marginBottom: 12 }}>
        ROUND {gameState.round} / 10{isBoss ? ' — BOSS' : ''}
      </div>

      {/* ---- BATTLE SCENE ---- */}
      <div className="battle-scene">
        {/* opponent HP box */}
        <div className="hpbox-opp">
          <HPBox pokemon={opponent} showNumbers={false} />
        </div>

        {/* opponent platform + sprite */}
        <div className="platform platform-opp" />
        <img
          className={`sprite sprite-opp appear ${oppHit ? 'shake flash' : ''} ${oppFaint ? 'faint' : ''}`}
          src={getSpriteUrl(opponent.nationalNum, true)}
          alt={opponent.name}
          onError={(e) => { e.target.src = getSpriteUrl(opponent.nationalNum, false) }}
        />
        {dmgFloat?.side === 'opp' && (
          <div className="dmg-float" style={{ top: '18%', right: '20%' }}>-{dmgFloat.value}</div>
        )}

        {/* player platform + sprite (back sprite) */}
        <div className="platform platform-ply" />
        {active && (
          <img
            className={`sprite sprite-ply ${plyHit ? 'shake flash' : ''}`}
            src={getBackSpriteUrl(active.nationalNum, true)}
            alt={active.name}
            onError={(e) => {
              // fall back: static back → animated front → static front
              e.target.onerror = () => { e.target.src = getSpriteUrl(active.nationalNum, false) }
              e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${active.nationalNum}.png`
            }}
          />
        )}
        {dmgFloat?.side === 'ply' && (
          <div className="dmg-float" style={{ bottom: '30%', left: '18%' }}>-{dmgFloat.value}</div>
        )}

        {/* player HP box */}
        {active && (
          <div className="hpbox-ply">
            <HPBox pokemon={active} showNumbers={true} />
          </div>
        )}
      </div>

      {/* ---- MESSAGE BOX ---- */}
      <div className="msgbox">{message}</div>

      {/* ---- CHOOSE POKEMON ---- */}
      {step === STEP.CHOOSE_POKEMON && (
        <div style={{ width: '100%', maxWidth: 720, marginTop: 10 }}>
          <div className="pixel" style={{ fontSize: 10, color: '#cdd7ee', marginBottom: 8 }}>
            CHOOSE YOUR POKEMON
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {team.map((p, i) => (
              <PokemonCard key={p.iri + i} pokemon={p} onClick={() => choosePokemon(i)} />
            ))}
          </div>
        </div>
      )}

      {/* ---- CHOOSE MOVE ---- */}
      {step === STEP.CHOOSE_MOVE && active && (
        hasUsableMoves(active) ? (
          <div className="move-menu">
            {active.moves.map((m, i) => (
              <MoveButton key={m.iri + i} move={m} onClick={useMove} />
            ))}
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: 720, marginTop: 10 }}>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={struggle}>
              STRUGGLE (OUT OF PP)
            </button>
          </div>
        )
      )}

      {/* ---- ANIMATING ---- */}
      {step === STEP.ANIMATING && (
        <div className="pixel blink" style={{ fontSize: 10, color: '#8896b8', marginTop: 14 }}>▼</div>
      )}
    </div>
  )
}

// message helper
function effMsg(label) {
  if (label === 'super') return "It's super effective!"
  if (label === 'half') return "It's not very effective..."
  if (label === 'none') return 'It had no effect...'
  return 'A solid hit!'
}
