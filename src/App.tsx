import React, { useState, useEffect } from 'react';

type Group = {
  category: string;
  color: string;
  words: string[];
};

type Puzzle = {
  id: string;
  title: string;
  author: string;
  groups_data: Group[];
  hints: string[];
  timer_seconds: number | null;
};

export default function App() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [mode, setMode] = useState<'create' | 'play'>('create');

  // Spelersstatus
  const [playerName, setPlayerName] = useState('');
  const [hasEnteredName, setHasEnteredName] = useState(false);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [solvedGroups, setSolvedGroups] = useState<Group[]>([]);
  const [remainingWords, setRemainingWords] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [hintsShown, setHintsShown] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [oneAwayMessage, setOneAwayMessage] = useState(false);

  // Maker Formulier Status
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [timerSeconds, setTimerSeconds] = useState<number | ''>('');
  const [hints, setHints] = useState<string[]>(['']);
  const [createdUrl, setCreatedUrl] = useState('');

  // 4 Categorieën
  const [groups, setGroups] = useState<Group[]>([
    { category: '', color: '#fef08a', words: ['', '', '', ''] },
    { category: '', color: '#bbf7d0', words: ['', '', '', ''] },
    { category: '', color: '#bfdbfe', words: ['', '', '', ''] },
    { category: '', color: '#fbcfe8', words: ['', '', '', ''] },
  ]);

  useEffect(() => {
    const path = window.location.pathname.replace('/', '');
    if (path) {
      loadPuzzle(path);
    }
  }, []);

  useEffect(() => {
    if (mode === 'play' && hasEnteredName && !isGameOver) {
      const interval = setInterval(() => {
        setSeconds((prev) => {
          if (puzzle?.timer_seconds && prev + 1 >= puzzle.timer_seconds) {
            setIsGameOver(true);
            alert('Tijd is om!');
            return puzzle.timer_seconds;
          }
          return prev + 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [mode, hasEnteredName, isGameOver, puzzle]);

  async function loadPuzzle(id: string) {
    try {
      const res = await fetch(`/api/puzzles/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPuzzle(data);
      
      const allWords = data.groups_data.flatMap((g: Group) => g.words);
      setRemainingWords(allWords.sort(() => Math.random() - 0.5));
      setMode('play');
    } catch {
      alert('Puzzel niet gevonden');
    }
  }

  async function handleCreatePuzzle(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title,
      author,
      groups_data: groups,
      hints: hints.filter((h) => h.trim() !== ''),
      timer_seconds: timerSeconds ? Number(timerSeconds) : null,
    };

    const res = await fetch('/api/puzzles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    setCreatedUrl(`${window.location.origin}/${data.id}`);
  }

  function handleWordClick(word: string) {
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter((w) => w !== word));
    } else if (selectedWords.length < 4) {
      setSelectedWords([...selectedWords, word]);
    }
  }

  function shuffleWords() {
    setRemainingWords([...remainingWords].sort(() => Math.random() - 0.5));
  }

  async function submitGuess() {
    if (!puzzle || selectedWords.length !== 4) return;

    setOneAwayMessage(false);

    // Controleer of de selectie exact matcht
    const matchedGroup = puzzle.groups_data.find((g) =>
      g.words.every((w) => selectedWords.includes(w))
    );

    if (matchedGroup) {
      const newSolved = [...solvedGroups, matchedGroup];
      setSolvedGroups(newSolved);
      setRemainingWords(remainingWords.filter((w) => !selectedWords.includes(w)));
      setSelectedWords([]);

      if (newSolved.length === 4) {
        setIsGameOver(true);
        await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            puzzle_id: puzzle.id,
            player_name: playerName,
            time_taken_seconds: seconds,
            mistakes
          })
        });
        await loadLeaderboard(puzzle.id);
        setShowLeaderboardModal(true); // Pop-up tonen
      }
    } else {
      // Check voor "1 away" (3 van de 4 woorden uit dezelfde categorie)
      const isOneAway = puzzle.groups_data.some((g) => {
        const matchCount = g.words.filter((w) => selectedWords.includes(w)).length;
        return matchCount === 3;
      });

      if (isOneAway) {
        setOneAwayMessage(true);
      }

      setMistakes(mistakes + 1);
    }
  }

  async function loadLeaderboard(id: string) {
    try {
      const res = await fetch(`/api/leaderboard/${id}`);
      const data = await res.json();
      setLeaderboard(data);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        html, body, #root {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          min-height: 100vh !important;
          background-color: #e2e8f0;
        }
      `}</style>

      <div style={styles.appContainer}>
        <header style={styles.header}>
          <div style={styles.logo} onClick={() => window.location.href = '/'}>
            DEN AGORIAANSE CONNECTIES
          </div>
        </header>

        <main style={styles.mainContent}>
          
          {/* --- MODUS 1: MAKER --- */}
          {mode === 'create' && (
            <div style={styles.glassCard}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Maak een Nieuwe Puzzel</h2>
              </div>

              {createdUrl ? (
                <div style={styles.successBox}>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#15803d', fontWeight: 800 }}>Puzzel succesvol aangemaakt! 🎉</h3>
                  <p style={{ margin: '0 0 1rem 0', color: '#334155' }}>Deel deze link direct om de puzzel te laten spelen:</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input style={styles.glassInput} value={createdUrl} readOnly />
                    <button style={{ ...styles.primaryBtn, width: 'auto', marginTop: 0 }} onClick={() => navigator.clipboard.writeText(createdUrl)}>Kopieer</button>
                  </div>
                  <button style={{ ...styles.secondaryBtn, marginTop: '1.25rem', width: '100%' }} onClick={() => window.location.href = createdUrl}>
                    Speel Puzzel Nu
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreatePuzzle}>
                  <div style={styles.grid2}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>TITEL VAN DE PUZZEL</label>
                      <input 
                        style={styles.glassInput} 
                        required 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>JOUW NAAM (MAKER)</label>
                      <input 
                        style={styles.glassInput} 
                        required 
                        value={author} 
                        onChange={(e) => setAuthor(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '1.75rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                      <label style={{ ...styles.label, fontSize: '1.1rem', color: '#0f172a', fontWeight: 800 }}>
                        4 CATEGORIEËN & WOORDEN
                      </label>
                    </div>

                    {groups.map((group, gIdx) => (
                      <div key={gIdx} style={{ ...styles.categoryBox, borderLeft: `5px solid ${group.color}` }}>
                        <div style={styles.categoryHeader}>
                          <input
                            style={{ ...styles.glassInput, width: '65%', fontWeight: '700' }}
                            required
                            value={group.category}
                            onChange={(e) => {
                              const newGroups = [...groups];
                              newGroups[gIdx].category = e.target.value;
                              setGroups(newGroups);
                            }}
                          />
                          
                          <div style={styles.colorBadgeWrapper}>
                            <span>Kleur:</span>
                            <div style={{ ...styles.colorSwatch, backgroundColor: group.color }}></div>
                            <input
                              type="color"
                              style={styles.colorPicker}
                              value={group.color}
                              onChange={(e) => {
                                const newGroups = [...groups];
                                newGroups[gIdx].color = e.target.value;
                                setGroups(newGroups);
                              }}
                            />
                          </div>
                        </div>

                        <div style={styles.grid4}>
                          {group.words.map((word, wIdx) => (
                            <input
                              key={wIdx}
                              style={{ ...styles.glassInput, fontSize: '0.9rem', textAlign: 'center' }}
                              required
                              value={word}
                              onChange={(e) => {
                                const newGroups = [...groups];
                                newGroups[gIdx].words[wIdx] = e.target.value;
                                setGroups(newGroups);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ ...styles.grid2, marginTop: '1.5rem' }}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Timer in seconden (optioneel)</label>
                      <input
                        type="number"
                        style={styles.glassInput}
                        value={timerSeconds}
                        onChange={(e) => setTimerSeconds(e.target.value ? Number(e.target.value) : '')}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Hints (optioneel)</label>
                      {hints.map((hint, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input
                            style={styles.glassInput}
                            value={hint}
                            onChange={(e) => {
                              const newHints = [...hints];
                              newHints[idx] = e.target.value;
                              setHints(newHints);
                            }}
                          />
                          {idx === hints.length - 1 && (
                            <button
                              type="button"
                              style={styles.addHintBtn}
                              onClick={() => setHints([...hints, ''])}
                            >
                              +
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button type="submit" style={styles.primaryBtn}>
                    Maak Connecties Puzzel Aan
                  </button>
                </form>
              )}
            </div>
          )}

          {/* --- MODUS 2: SPEELVELD --- */}
          {mode === 'play' && puzzle && (
            <div style={{ maxWidth: '650px', margin: '0 auto' }}>
              {!hasEnteredName ? (
                <div style={{ ...styles.glassCard, textAlign: 'center', maxWidth: '450px', margin: '2rem auto' }}>
                  <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: 800 }}>{puzzle.title}</h2>
                  <p style={{ color: '#64748b', marginTop: 0, fontSize: '0.95rem' }}>Gemaakt door: <strong style={{ color: '#0f172a' }}>{puzzle.author}</strong></p>

                  <div style={{ margin: '1.75rem 0' }}>
                    <label style={{ ...styles.label, textAlign: 'left' }}>Vul je naam in voor het leaderboard:</label>
                    <input
                      style={{ ...styles.glassInput, fontSize: '1.1rem', padding: '0.85rem 1rem', textAlign: 'center' }}
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                    />
                  </div>

                  <button
                    disabled={!playerName.trim()}
                    onClick={() => setHasEnteredName(true)}
                    style={{ ...styles.primaryBtn, marginTop: 0, opacity: playerName.trim() ? 1 : 0.6 }}
                  >
                    Start Spel
                  </button>
                </div>
              ) : (
                <div>
                  <div style={styles.gameHeaderBar}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{puzzle.title}</h2>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Maker: {puzzle.author}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <button 
                        style={styles.secondaryBtn} 
                        onClick={async () => {
                          await loadLeaderboard(puzzle.id);
                          setShowLeaderboardModal(true);
                        }}
                      >
                        🏆 Stand
                      </button>
                      <div style={styles.statBadge}>
                        ⏱️ <strong>{seconds}s</strong> {puzzle.timer_seconds ? `/ ${puzzle.timer_seconds}s` : ''}
                      </div>
                      <div style={{ ...styles.statBadge, backgroundColor: mistakes > 0 ? '#fef2f2' : 'rgba(255,255,255,0.8)', color: mistakes > 0 ? '#dc2626' : '#0f172a' }}>
                        ❌ Fouten: <strong>{mistakes}</strong>
                      </div>
                    </div>
                  </div>

                  {/* 1 AWAY MELDING */}
                  {oneAwayMessage && (
                    <div style={styles.oneAwayToast}>
                      ⚠️ Nog 1 verwijderd! (3 van de 4 klopten)
                    </div>
                  )}

                  {puzzle.hints.length > 0 && (
                    <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                      {hintsShown < puzzle.hints.length && (
                        <button style={styles.secondaryBtn} onClick={() => setHintsShown(hintsShown + 1)}>
                          💡 Vraag Hint ({hintsShown}/{puzzle.hints.length})
                        </button>
                      )}
                      <div style={{ marginTop: '0.5rem' }}>
                        {puzzle.hints.slice(0, hintsShown).map((h, i) => (
                          <div key={i} style={styles.hintCard}>Hint {i + 1}: {h}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    {solvedGroups.map((group, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: group.color,
                          padding: '1.25rem',
                          borderRadius: '14px',
                          textAlign: 'center',
                          color: '#0f172a',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                        }}
                      >
                        <h3 style={{ margin: '0 0 0.25rem 0', textTransform: 'uppercase', fontSize: '1.05rem', letterSpacing: '0.5px' }}>{group.category}</h3>
                        <p style={{ margin: 0, fontWeight: 600 }}>{group.words.join(', ')}</p>
                      </div>
                    ))}
                  </div>

                  {!isGameOver && (
                    <>
                      <div style={styles.wordGrid}>
                        {remainingWords.map((word, idx) => {
                          const isSelected = selectedWords.includes(word);
                          return (
                            <button
                              key={idx}
                              onClick={() => handleWordClick(word)}
                              style={{
                                ...styles.wordCard,
                                backgroundColor: isSelected ? '#cbd5e1' : 'rgba(255, 255, 255, 0.85)',
                                color: '#000000', // Altijd duidelijke zwarte tekst!
                                borderColor: isSelected ? '#0f172a' : 'rgba(203, 213, 225, 0.8)',
                                transform: isSelected ? 'scale(0.96)' : 'scale(1)'
                              }}
                            >
                              {word}
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1.75rem' }}>
                        <button style={styles.secondaryBtn} onClick={shuffleWords}>🔀 Schudden</button>
                        <button style={styles.secondaryBtn} onClick={() => setSelectedWords([])} disabled={selectedWords.length === 0}>
                          Deselecteer Alles
                        </button>
                        <button
                          style={{ ...styles.primaryBtn, width: 'auto', marginTop: 0, padding: '0.75rem 1.75rem' }}
                          disabled={selectedWords.length !== 4}
                          onClick={submitGuess}
                        >
                          Verstuur ({selectedWords.length}/4)
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* --- LEADERBOARD POP-UP MODAL --- */}
          {showLeaderboardModal && (
            <div style={styles.modalOverlay}>
              <div style={styles.modalCard}>
                <div style={styles.modalHeader}>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>🏆 Leaderboard</h2>
                  <button style={styles.closeBtn} onClick={() => setShowLeaderboardModal(false)}>✕</button>
                </div>

                <p style={{ color: '#64748b', marginTop: 0, fontSize: '0.9rem', textAlign: 'center' }}>Top resultaten voor deze puzzel</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', margin: '1.25rem 0' }}>
                  {leaderboard.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#64748b' }}>Nog geen scores bekend.</p>
                  ) : (
                    leaderboard.map((entry, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.8rem 1rem',
                          backgroundColor: idx === 0 ? '#fefce8' : 'rgba(248, 250, 252, 0.9)',
                          borderRadius: '12px',
                          border: idx === 0 ? '2px solid #fde047' : '1px solid rgba(226, 232, 240, 0.8)',
                          fontWeight: idx === 0 ? '700' : '500'
                        }}
                      >
                        <span style={{ fontSize: '0.95rem' }}>
                          {idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : `#${idx + 1} `} 
                          {entry.player_name}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                          ⏱️ {entry.time_taken_seconds}s | ❌ {entry.mistakes} fouten
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <button style={styles.primaryBtn} onClick={() => window.location.href = '/'}>
                  Maak Zelf Een Nieuwe Puzzel
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  appContainer: {
    background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
    minHeight: '100vh',
    width: '100%',
    margin: 0,
    padding: 0,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#0f172a'
  },
  header: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    borderBottom: '3px solid #ea580c',
    padding: '1.75rem 2rem 1.25rem 2rem',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
  },
  logo: {
    color: '#ea580c',
    fontSize: '2.2rem',
    fontWeight: 900,
    letterSpacing: '-0.5px',
    textTransform: 'uppercase',
    cursor: 'pointer',
    lineHeight: '1.1'
  },
  mainContent: {
    maxWidth: '850px',
    margin: '0 auto',
    padding: '2.5rem 1.5rem'
  },
  glassCard: {
    background: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    borderRadius: '20px',
    padding: '2.25rem',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)'
  },
  sectionHeader: {
    marginBottom: '1.75rem',
    borderBottom: '1px solid rgba(203, 213, 225, 0.6)',
    paddingBottom: '1rem',
    textAlign: 'center'
  },
  sectionTitle: {
    fontSize: '1.6rem',
    color: '#0f172a',
    margin: 0,
    fontWeight: 800
  },
  formGroup: {
    marginBottom: '1.25rem'
  },
  label: {
    display: 'block',
    fontWeight: 700,
    fontSize: '0.8rem',
    color: '#334155',
    marginBottom: '0.4rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  glassInput: {
    width: '100%',
    padding: '0.8rem 1rem',
    borderRadius: '12px',
    border: '1px solid rgba(203, 213, 225, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    color: '#0f172a',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.25rem'
  },
  grid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.65rem'
  },
  categoryBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    border: '1px solid rgba(226, 232, 240, 0.8)',
    borderRadius: '16px',
    padding: '1.25rem',
    marginBottom: '1.25rem'
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.85rem'
  },
  colorBadgeWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    fontWeight: 700,
    fontSize: '0.85rem',
    color: '#475569',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '0.4rem 0.75rem',
    borderRadius: '10px',
    border: '1px solid #e2e8f0'
  },
  colorSwatch: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    border: '2px solid #ffffff',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.15)'
  },
  colorPicker: {
    border: 'none',
    background: 'transparent',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    padding: 0
  },
  addHintBtn: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: 'none',
    padding: '0 1.25rem',
    borderRadius: '10px',
    fontWeight: 800,
    fontSize: '1.2rem',
    cursor: 'pointer'
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '1rem 1.5rem',
    borderRadius: '12px',
    fontWeight: 800,
    fontSize: '1rem',
    cursor: 'pointer',
    width: '100%',
    marginTop: '1.5rem',
    boxShadow: '0 8px 20px rgba(234, 88, 12, 0.25)',
    letterSpacing: '0.3px'
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    padding: '0.65rem 1.2rem',
    borderRadius: '10px',
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer'
  },
  wordGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.75rem'
  },
  wordCard: {
    aspectRatio: '1.3',
    border: '2px solid',
    borderRadius: '14px',
    fontSize: '0.95rem',
    fontWeight: 800,
    cursor: 'pointer',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    backdropFilter: 'blur(8px)',
    transition: 'all 0.15s ease'
  },
  gameHeaderBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2px solid rgba(226, 232, 240, 0.8)',
    paddingBottom: '1rem',
    marginBottom: '1.25rem'
  },
  statBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: '0.5rem 0.85rem',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: 500,
    border: '1px solid rgba(226, 232, 240, 0.8)'
  },
  hintCard: {
    backgroundColor: '#fef9c3',
    color: '#854d0e',
    padding: '0.6rem 1rem',
    borderRadius: '10px',
    fontSize: '0.9rem',
    display: 'inline-block',
    margin: '0.25rem',
    border: '1px solid #fde047'
  },
  successBox: {
    backgroundColor: 'rgba(240, 253, 244, 0.85)',
    border: '1px solid #bbf7d0',
    padding: '1.75rem',
    borderRadius: '14px'
  },
  oneAwayToast: {
    backgroundColor: '#fff7ed',
    color: '#c2410c',
    border: '1px solid #ffedd5',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    textAlign: 'center',
    fontWeight: 700,
    marginBottom: '1.25rem'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '1.75rem',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.25rem'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '1.25rem',
    fontWeight: 800,
    cursor: 'pointer',
    color: '#64748b'
  }
};
