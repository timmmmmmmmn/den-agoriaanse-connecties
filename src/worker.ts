export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers });

    // 1. Nieuwe puzzel opslaan
    if (url.pathname === '/api/puzzles' && request.method === 'POST') {
      const body: any = await request.json();
      const id = Math.random().toString(36).substring(2, 8); // Unieke ID van 6 tekens
      
      await env.DB.prepare(
        `INSERT INTO puzzles (id, title, author, groups_data, hints, timer_seconds, theme_colors) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        body.title || 'Naamloze Puzzel',
        body.author || 'Anoniem',
        JSON.stringify(body.groups_data),
        JSON.stringify(body.hints || []),
        body.timer_seconds || null,
        JSON.stringify(body.theme_colors || { bg: '#ffffff', text: '#000000', card: '#e2e8f0' })
      ).run();

      return new Response(JSON.stringify({ id }), { headers });
    }

    // 2. Puzzel ophalen via ID
    if (url.pathname.startsWith('/api/puzzles/') && request.method === 'GET') {
      const id = url.pathname.split('/')[3];
      const puzzle: any = await env.DB.prepare(`SELECT * FROM puzzles WHERE id = ?`).bind(id).first();

      if (!puzzle) {
        return new Response(JSON.stringify({ error: 'Puzzel niet gevonden' }), { status: 404, headers });
      }

      puzzle.groups_data = JSON.parse(puzzle.groups_data);
      puzzle.hints = JSON.parse(puzzle.hints);
      puzzle.theme_colors = JSON.parse(puzzle.theme_colors);

      return new Response(JSON.stringify(puzzle), { headers });
    }

    // 3. Score toevoegen aan Leaderboard
    if (url.pathname === '/api/leaderboard' && request.method === 'POST') {
      const body: any = await request.json();
      
      await env.DB.prepare(
        `INSERT INTO leaderboard (puzzle_id, player_name, time_taken_seconds, mistakes) VALUES (?, ?, ?, ?)`
      ).bind(body.puzzle_id, body.player_name, body.time_taken_seconds, body.mistakes).run();

      return new Response(JSON.stringify({ success: true }), { headers });
    }

    // 4. Leaderboard ophalen per puzzel
    if (url.pathname.startsWith('/api/leaderboard/') && request.method === 'GET') {
      const puzzleId = url.pathname.split('/')[3];
      const { results } = await env.DB.prepare(
        `SELECT player_name, time_taken_seconds, mistakes, completed_at 
         FROM leaderboard 
         WHERE puzzle_id = ? 
         ORDER BY mistakes ASC, time_taken_seconds ASC 
         LIMIT 10`
      ).bind(puzzleId).all();

      return new Response(JSON.stringify(results), { headers });
    }

    return new Response('Not Found', { status: 404 });
  }
};
