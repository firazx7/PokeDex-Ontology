// =============================================
// BattleScreen.jsx — GBA Battle Scene (FULLY BUILT)
// =============================================
// Layout: battle scene on the LEFT, message box + controls on the
// RIGHT, so everything fits on screen without scrolling.
//
// All battle logic lives in utils/battle.js. This file is
// presentation + orchestration only.

import { useEffect, useState } from 'react'
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

// ─────────────────────────────────────────────
// MESSAGE TIMING (ms) — tune the pacing here
// ─────────────────────────────────────────────
const T = {
  announce: 1100,  // how long "X used Y!" stays before the hit resolves
  impact:    450,  // pause right after the sprite gets hit
  effect:   1500,  // how long "It's super effective!" stays on screen
  faint:     900,  // pause after a Pokemon faints
}

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
  const [dmgFloat, setDmgFloat] = useState(null)

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

    // 1. Announce the move and let the player read it
    setMessage(`${active.name} used ${move.name}!`)
    await wait(T.announce)

    const { multiplier, label } = await getEffectiveness(query, move.typeIRI, opponent.types)
    const dmg = calculateDamage(active, opponent, move.power, multiplier)

    // 2. Impact
    setOppHit(true); setTimeout(() => setOppHit(false), 400)
    showDamage('opp', dmg)

    const newTeam = team.map((p, i) =>
      i !== activeIndex ? p : {
        ...p,
        moves: p.moves.map(m => m.name === move.name ? { ...m, currentPP: Math.max(0, m.currentPP - 1) } : m),
      })
    const newHP = Math.max(0, opponent.currentHP - dmg)
    const newOpp = { ...opponent, currentHP: newHP, fainted: newHP <= 0 }
    setTeam(newTeam)
    setOpponent(newOpp)
    await wait(T.impact)

    // 3. Effectiveness message, held long enough to read
    setMessage(effMsg(label, dmg))
    await wait(T.effect)

    if (newOpp.fainted) {
      setOppFaint(true)
      setMessage(`${newOpp.name} fainted!`)
      await wait(T.faint)
      endRound(newTeam, newOpp)
      return
    }
    await opponentTurn(newTeam, newOpp)
  }

  // ── Struggle ────────────────────────────────────
  const struggle = async () => {
    if (step !== STEP.CHOOSE_MOVE || !active || !opponent) return
    setStep(STEP.ANIMATING)

    setMessage(`${active.name} has no moves left and used Struggle!`)
    await wait(T.announce)

    setOppHit(true); setTimeout(() => setOppHit(false), 400)
    showDamage('opp', STRUGGLE.damageToTarget)
    const newOppHP = Math.max(0, opponent.currentHP - STRUGGLE.damageToTarget)
    const newOpp = { ...opponent, currentHP: newOppHP, fainted: newOppHP <= 0 }

    let newTeam = applyDamage(team, activeIndex, STRUGGLE.recoilToSelf)
    setPlyHit(true); setTimeout(() => setPlyHit(false), 400)
    showDamage('ply', STRUGGLE.recoilToSelf)

    setTeam(newTeam); setOpponent(newOpp)
    await wait(T.impact)
    setMessage(`${active.name} is hurt by recoil!`)
    await wait(T.effect)

    if (newOpp.fainted) {
      setOppFaint(true)
      setMessage(`${newOpp.name} fainted!`)
      await wait(T.faint)
      endRound(newTeam, newOpp); return
    }
    if (newTeam[activeIndex].fainted) { activeFainted(newTeam); return }
    await opponentTurn(newTeam, newOpp)
  }

  // ── Opponent AI turn ────────────────────────────
  const opponentTurn = async (workingTeam, workingOpp) => {
    const choice = await chooseOpponentMove(query, workingOpp, active.types)

    if (choice.kind === 'struggle') {
      setMessage(`${workingOpp.name} used Struggle!`)
      await wait(T.announce)
      setPlyHit(true); setTimeout(() => setPlyHit(false), 400)
      showDamage('ply', STRUGGLE.damageToTarget)
      const nt = applyDamage(workingTeam, activeIndex, STRUGGLE.damageToTarget)
      setTeam(nt)
      await wait(T.impact + T.effect)
      finishOppTurn(nt)
      return
    }

    // 1. Announce which move the OPPONENT is using — held so it's readable
    const moveTypeIRI = resolveOpponentMoveType(workingOpp.moves, choice.move.name)
    const typeName = moveTypeIRI.replace(':', '')
    setMessage(`Foe ${workingOpp.name} used ${choice.move.name}!`)
    await wait(T.announce)

    const { multiplier, label } = await getEffectiveness(query, moveTypeIRI, active.types)
    const dmg = calculateDamage(workingOpp, active, choice.move.power, multiplier)

    // 2. Impact
    setPlyHit(true); setTimeout(() => setPlyHit(false), 400)
    showDamage('ply', dmg)
    const nt = applyDamage(workingTeam, activeIndex, dmg)
    setTeam(nt)
    await wait(T.impact)

    // 3. Effectiveness
    setMessage(effMsg(label, dmg))
    await wait(T.effect)
    finishOppTurn(nt)
  }

  const finishOppTurn = (workingTeam) => {
    if (workingTeam[activeIndex].fainted) activeFainted(workingTeam)
    else setStep(STEP.CHOOSE_MOVE)
  }

  const activeFainted = async (workingTeam) => {
    setMessage(`${team[activeIndex].name} fainted!`)
    await wait(T.faint)
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

  // ── Render: loading ─────────────────────────────
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

  // ── Render: battle ──────────────────────────────
  return (
    <div className="battle-screen">

      {/* ================= LEFT: the battle scene ================= */}
      <div className="battle-left">
        <div className="round-pill" style={{ alignSelf: 'center' }}>
          ROUND {gameState.round} / 10{isBoss ? ' — BOSS' : ''}
        </div>

        <div className="battle-scene">
          <div className="hpbox-opp">
            <HPBox pokemon={opponent} showNumbers={false} />
          </div>

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

          <div className="platform platform-ply" />
          {active && (
            <img
              className={`sprite sprite-ply ${plyHit ? 'shake flash' : ''}`}
              src={getBackSpriteUrl(active.nationalNum, true)}
              alt={active.name}
              onError={(e) => {
                e.target.onerror = () => { e.target.src = getSpriteUrl(active.nationalNum, false) }
                e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${active.nationalNum}.png`
              }}
            />
          )}
          {dmgFloat?.side === 'ply' && (
            <div className="dmg-float" style={{ bottom: '30%', left: '18%' }}>-{dmgFloat.value}</div>
          )}

          {active && (
            <div className="hpbox-ply">
              <HPBox pokemon={active} showNumbers={true} />
            </div>
          )}
        </div>
      </div>

      {/* ================= RIGHT: message + controls ================= */}
      <div className="battle-right">
        <div className="msgbox">{message}</div>

        {step === STEP.CHOOSE_POKEMON && (
          <div className="control-panel">
            <div className="pixel panel-label">CHOOSE YOUR POKEMON</div>
            <div className="team-grid">
              {team.map((p, i) => (
                <PokemonCard key={p.iri + i} pokemon={p} onClick={() => choosePokemon(i)} />
              ))}
            </div>
          </div>
        )}

        {step === STEP.CHOOSE_MOVE && active && (
          <div className="control-panel">
            <div className="pixel panel-label">CHOOSE A MOVE</div>
            {hasUsableMoves(active) ? (
              <div className="move-list">
                {active.moves.map((m, i) => (
                  <MoveButton key={m.iri + i} move={m} onClick={useMove} />
                ))}
              </div>
            ) : (
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={struggle}>
                STRUGGLE (OUT OF PP)
              </button>
            )}
          </div>
        )}

        {step === STEP.ANIMATING && (
          <div className="control-panel center" style={{ justifyContent: 'center' }}>
            <div className="pixel blink" style={{ fontSize: 12, color: '#8896b8' }}>▼</div>
          </div>
        )}
      </div>
    </div>
  )
}

// message helper — now also reports the damage dealt
function effMsg(label, dmg) {
  if (label === 'super') return `It's super effective! (${dmg} dmg)`
  if (label === 'half') return `It's not very effective... (${dmg} dmg)`
  if (label === 'none') return 'It had no effect...'
  return `A solid hit! (${dmg} dmg)`
}
