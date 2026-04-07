// API module — results stored in PostgreSQL via backend API
const API = {
  // URL бекенду на VPS (змінити на реальний домен після деплою)
  BASE_URL: 'https://ТВІЙ_ДОМЕН',
  TEACHER_PASSWORD: 'math2024',

  _headers(teacher = false) {
    const h = { 'Content-Type': 'application/json' };
    if (teacher) h['x-teacher-password'] = this.TEACHER_PASSWORD;
    return h;
  },

  // Save a quiz result (called by students after completing quiz)
  async saveResult(data) {
    const result = {
      name: data.name,
      email: data.email || '',
      picture: data.picture || '',
      quizId: data.quizId || 'unknown',
      quizTitle: data.quizTitle || 'Квіз',
      score: data.score,
      total: data.total,
      percentage: Math.round((data.score / data.total) * 100),
      mode: data.mode || 'exam',
      timeSpent: data.timeSpent || null,
      answers: data.answers || null,
    };

    try {
      const res = await fetch(`${this.BASE_URL}/api/results`, {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify(result)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error('Failed to save result:', e);
      // Fallback: save to localStorage
      const local = JSON.parse(localStorage.getItem('quiz_results_local') || '[]');
      local.push({ ...result, id: Date.now(), date: new Date().toISOString() });
      localStorage.setItem('quiz_results_local', JSON.stringify(local));
      return { error: e.message };
    }
  },

  // Get all results (teacher dashboard)
  async getResults() {
    try {
      const res = await fetch(`${this.BASE_URL}/api/results`, {
        headers: this._headers(true)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const remote = await res.json();
      // Merge with any localStorage fallback results
      const local = JSON.parse(localStorage.getItem('quiz_results_local') || '[]');
      const seen = new Set(remote.map(r => r.id));
      return [...remote, ...local.filter(r => !seen.has(r.id))];
    } catch (e) {
      console.error('Failed to load results:', e);
      return JSON.parse(localStorage.getItem('quiz_results_local') || '[]');
    }
  },

  // Get results for a specific student by email
  async getResultsByEmail(email) {
    try {
      const res = await fetch(`${this.BASE_URL}/api/results/my?email=${encodeURIComponent(email)}`, {
        headers: this._headers()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error('Failed to load student results:', e);
      const local = JSON.parse(localStorage.getItem('quiz_results_local') || '[]');
      return local.filter(r => r.email && r.email.toLowerCase() === email.toLowerCase());
    }
  },

  // Clear all results (teacher only)
  async clearResults() {
    try {
      const res = await fetch(`${this.BASE_URL}/api/results`, {
        method: 'DELETE',
        headers: this._headers(true)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      localStorage.removeItem('quiz_results_local');
      return { success: true };
    } catch (e) {
      return { error: e.message };
    }
  },

  // Check teacher password (local check)
  checkPassword(password) {
    return password === this.TEACHER_PASSWORD;
  }
};
