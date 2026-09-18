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
  const [mode, setMode] = useState<'create' | 'play' | 'leaderboard'>('create');

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
        loadLeaderboard(puzzle.id);
      }
    } else {
      setMistakes(mistakes + 1);
      alert('Foutieve combinatie!');
    }
  }

  async function loadLeaderboard(id: string) {
    const res = await fetch(`/api/leaderboard/${id}`);
    const data = await res.json();
    setLeaderboard(data);
    setMode('leaderboard');
  }

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <div style={styles.logo} onClick={() => window.location.href = '/'}>
          DEN AGORIAANSE CONNECTIES
        </div>
      </header>

      <main style={styles.mainContent}>
        
        {/* --- MODUS 1: MAKER --- */}
        {mode === 'create' && (
          <div style={styles.cardContainer}>
            <h2 style={styles.sectionTitle}>Maak een Nieuwe Puzzel</h2>

            {createdUrl ? (
              <div style={styles.successBox}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#166534' }}>Puzzel succesvol aangemaakt!</h3>
                <p style={{ margin: '0 0 1rem 0' }}>Deel deze link met je klasgenoten:</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input style={styles.inputField} value={createdUrl} readOnly />
                  <button style={styles.primaryBtn} onClick={() => navigator.clipboard.writeText(createdUrl)}>Kopieer</button>
                </div>
                <button style={{ ...styles.secondaryBtn, marginTop: '1rem', width: '100%' }} onClick={() => window.location.href = createdUrl}>
                  Speel Puzzel Nu
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreatePuzzle}>
                <div style={styles.grid2}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Titel van de Puzzel</label>
                    <input style={styles.inputField} required value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Jouw Naam (Maker)</label>
                    <input style={styles.inputField} required value={author} onChange={(e) => setAuthor(e.target.value)} />
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <label style={{ ...styles.label, fontSize: '1rem', marginBottom: '0.75rem' }}>4 Categorieën & Woorden</label>

                  {groups.map((group, gIdx) => (
                    <div key={gIdx} style={styles.categoryBox}>
                      <div style={styles.categoryHeader}>
                        <input
                          style={{ ...styles.inputField, width: '70%', fontWeight: 'bold' }}
                          required
                          value={group.category}
                          onChange={(e) => {
                            const newGroups = [...groups];
                            newGroups[gIdx].category = e.target.value;
                            setGroups(newGroups);
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.85rem' }}>
                          Kleur:
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
                            style={styles.inputField}
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
                      style={styles.inputField}
                      value={timerSeconds}
                      onChange={(e) => setTimerSeconds(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Hints (optioneel)</label>
                    {hints.map((hint, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input
                          style={styles.inputField}
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
                  Verwissel de connectie en krijg een link
                </button>
              </form>
            )}
          </div>
        )}

        {/* --- MODUS 2: SPEELVELD --- */}
        {mode === 'play' && puzzle && (
          <div style={{ maxWidth: '650px', margin: '0 auto' }}>
            {!hasEnteredName ? (
              <div style={{ ...styles.cardContainer, textAlign: 'center', maxWidth: '450px', margin: '2rem auto' }}>
                <h2 style={{ margin: '0 0 0.5rem 0' }}>{puzzle.title}</h2>
                <p style={{ color: '#64748b', marginTop: 0 }}>Gemaakt door: <strong>{puzzle.author}</strong></p>

                <div style={{ margin: '1.5rem 0' }}>
                  <label style={{ ...styles.label, textAlign: 'left' }}>Vul je naam in voor het leaderboard:</label>
                  <input
                    style={{ ...styles.inputField, fontSize: '1.1rem', padding: '0.75rem' }}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                </div>

                <button
                  disabled={!playerName.trim()}
                  onClick={() => setHasEnteredName(true)}
                  style={{ ...styles.primaryBtn, marginTop: 0 }}
                >
                  Start Spel
                </button>
              </div>
            ) : (
              <div>
                <div style={styles.gameHeaderBar}>
                  <div>
                    <h2 style={{ margin: 0 }}>{puzzle.title}</h2>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Maker: {puzzle.author}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={styles.statBadge}>
                      Tijd: <strong>{seconds}s</strong> {puzzle.timer_seconds ? `/ ${puzzle.timer_seconds}s` : ''}
                    </div>
                    <div style={styles.statBadge}>
                      Fouten: <strong>{mistakes}</strong>
                    </div>
                  </div>
                </div>

                {puzzle.hints.length > 0 && (
                  <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    {hintsShown < puzzle.hints.length && (
                      <button style={styles.secondaryBtn} onClick={() => setHintsShown(hintsShown + 1)}>
                        Vraag Hint ({hintsShown}/{puzzle.hints.length})
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
                        borderRadius: '12px',
                        textAlign: 'center',
                        color: '#0f172a'
                      }}
                    >
                      <h3 style={{ margin: '0 0 0.25rem 0', textTransform: 'uppercase' }}>{group.category}</h3>
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
                              backgroundColor: isSelected ? '#0f172a' : '#ffffff',
                              color: isSelected ? '#ffffff' : '#0f172a',
                              borderColor: isSelected ? '#0f172a' : '#e2e8f0'
                            }}
                          >
                            {word}
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                      <button style={styles.secondaryBtn} onClick={shuffleWords}>Schudden</button>
                      <button style={styles.secondaryBtn} onClick={() => setSelectedWords([])} disabled={selectedWords.length === 0}>
                        Deselecteer alles
                      </button>
                      <button
                        style={{ ...styles.primaryBtn, width: 'auto', marginTop: 0 }}
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

        {/* --- MODUS 3: LEADERBOARD --- */}
        {mode === 'leaderboard' && (
          <div style={{ ...styles.cardContainer, maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Leaderboard - Top 10</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {leaderboard.map((entry, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    backgroundColor: idx === 0 ? '#fef9c3' : '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontWeight: idx === 0 ? 'bold' : 'normal'
                  }}
                >
                  <span>#{idx + 1} {entry.player_name}</span>
                  <span style={{ color: '#64748b' }}>{entry.time_taken_seconds}s | {entry.mistakes} fouten</span>
                </div>
              ))}
            </div>

            <button style={styles.primaryBtn} onClick={() => window.location.href = '/'}>
              Maak Zelf Een Connectie
            </button>
          </div>
        )}

      </main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  appContainer: {
    backgroundColor: '#ffffff',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#0f172a'
  },
  header: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderBottom: '2px solid #f1f5f9',
    padding: '1.5rem 2rem',
    textAlign: 'center'
  },
  logo: {
    color: '#ea580c',
    fontSize: '2.2rem',
    fontWeight: 900,
    letterSpacing: '-0.5px',
    textTransform: 'uppercase',
    cursor: 'pointer'
  },
  mainContent: {
    maxWidth: '850px',
    margin: '0 auto',
    padding: '2rem 1.5rem'
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
  },
  sectionTitle: {
    fontSize: '1.5rem',
    color: '#0f172a',
    marginBottom: '1.5rem',
    fontWeight: 800
  },
  formGroup: {
    marginBottom: '1.25rem'
  },
  label: {
    display: 'block',
    fontWeight: 700,
    fontSize: '0.85rem',
    color: '#0f172a',
    marginBottom: '0.4rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  inputField: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '2px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: '1rem',
    outline: 'none'
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
  },
  grid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.5rem'
  },
  categoryBox: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1.25rem'
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem'
  },
  colorPicker: {
    border: 'none',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer'
  },
  addHintBtn: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: 'none',
    padding: '0 1.25rem',
    borderRadius: '8px',
    fontWeight: 800,
    fontSize: '1.2rem',
    cursor: 'pointer'
  },
  primaryBtn: {
    backgroundColor: '#ea580c',
    color: '#ffffff',
    border: 'none',
    padding: '1rem 1.5rem',
    borderRadius: '10px',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    width: '100%',
    marginTop: '1.5rem'
  },
  secondaryBtn: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    border: '2px solid #0f172a',
    padding: '0.6rem 1rem',
    borderRadius: '8px',
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
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: 800,
    cursor: 'pointer',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem',
    textAlign: 'center'
  },
  gameHeaderBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '1rem',
    marginBottom: '1rem'
  },
  statBadge: {
    backgroundColor: '#f1f5f9',
    padding: '0.4rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.9rem'
  },
  hintCard: {
    backgroundColor: '#fef9c3',
    color: '#854d0e',
    padding: '0.6rem 1rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    display: 'inline-block',
    margin: '0.25rem'
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    padding: '1.5rem',
    borderRadius: '12px'
  }
};
