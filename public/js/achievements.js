// Achievement system
const ACHIEVEMENTS = [
  {
    id: 'first_quiz',
    icon: '🎯',
    title: 'Перший крок',
    description: 'Пройти перший квіз',
    check: (results) => results.length >= 1
  },
  {
    id: 'perfect',
    icon: '💎',
    title: 'Бездоганно!',
    description: 'Отримати 100% на будь-якому квізі',
    check: (results) => results.some(r => r.percentage === 100)
  },
  {
    id: 'five_quizzes',
    icon: '⭐',
    title: 'П\'ятірка',
    description: 'Пройти 5 різних квізів',
    check: (results) => new Set(results.map(r => r.quizId)).size >= 5
  },
  {
    id: 'ten_quizzes',
    icon: '🏆',
    title: 'Десятка',
    description: 'Пройти 10 різних квізів',
    check: (results) => new Set(results.map(r => r.quizId)).size >= 10
  },
  {
    id: 'speedster',
    icon: '⚡',
    title: 'Швидкий розум',
    description: 'Пройти квіз менш ніж за 2 хвилини',
    check: (results) => results.some(r => r.timeSpent < 120 && r.percentage >= 50)
  },
  {
    id: 'excellent',
    icon: '🌟',
    title: 'Відмінник',
    description: 'Отримати 90%+ на 3 різних квізах',
    check: (results) => {
      const excellentQuizzes = new Set(results.filter(r => r.percentage >= 90).map(r => r.quizId));
      return excellentQuizzes.size >= 3;
    }
  },
  {
    id: 'persistent',
    icon: '💪',
    title: 'Наполегливість',
    description: 'Покращити результат на одному квізі',
    check: (results) => {
      const byQuiz = {};
      results.forEach(r => {
        if (!byQuiz[r.quizId]) byQuiz[r.quizId] = [];
        byQuiz[r.quizId].push(r);
      });
      return Object.values(byQuiz).some(attempts => {
        if (attempts.length < 2) return false;
        const sorted = attempts.sort((a, b) => new Date(a.date) - new Date(b.date));
        return sorted[sorted.length - 1].percentage > sorted[0].percentage;
      });
    }
  },
  {
    id: 'section_master',
    icon: '📚',
    title: 'Знавець розділу',
    description: 'Пройти всі квізи одного розділу з 70%+',
    check: (results, quizzes) => {
      if (!quizzes) return false;
      const sections = {};
      quizzes.forEach(q => {
        if (!sections[q.section]) sections[q.section] = new Set();
        sections[q.section].add(q.id);
      });
      const passed = {};
      results.filter(r => r.percentage >= 70).forEach(r => {
        const quiz = quizzes.find(q => q.id === r.quizId);
        if (quiz) {
          if (!passed[quiz.section]) passed[quiz.section] = new Set();
          passed[quiz.section].add(r.quizId);
        }
      });
      return Object.entries(sections).some(([sec, quizIds]) =>
        passed[sec] && passed[sec].size >= quizIds.size
      );
    }
  },
  {
    id: 'marathon',
    icon: '🏃',
    title: 'Марафонець',
    description: 'Пройти 20 квізів загалом',
    check: (results) => results.length >= 20
  },
  {
    id: 'all_types',
    icon: '🎨',
    title: 'Різнобічний',
    description: 'Пройти квіз з кожного розділу',
    check: (results, quizzes) => {
      if (!quizzes) return false;
      const allSections = new Set(quizzes.map(q => q.section));
      const passedSections = new Set();
      results.forEach(r => {
        const quiz = quizzes.find(q => q.id === r.quizId);
        if (quiz) passedSections.add(quiz.section);
      });
      return passedSections.size >= allSections.size;
    }
  }
];

// Get earned achievements for a set of results
function getEarnedAchievements(results, quizzes) {
  return ACHIEVEMENTS.filter(a => a.check(results, quizzes));
}

// Get unearned achievements
function getLockedAchievements(results, quizzes) {
  return ACHIEVEMENTS.filter(a => !a.check(results, quizzes));
}

// Render achievements HTML
function renderAchievementsHTML(results, quizzes) {
  const earned = getEarnedAchievements(results, quizzes);
  const locked = getLockedAchievements(results, quizzes);

  let html = '<div class="achievements-grid">';

  earned.forEach(a => {
    html += `
      <div class="achievement earned">
        <span class="achievement-icon">${a.icon}</span>
        <div class="achievement-info">
          <div class="achievement-title">${a.title}</div>
          <div class="achievement-desc">${a.description}</div>
        </div>
      </div>`;
  });

  locked.forEach(a => {
    html += `
      <div class="achievement locked">
        <span class="achievement-icon">🔒</span>
        <div class="achievement-info">
          <div class="achievement-title">${a.title}</div>
          <div class="achievement-desc">${a.description}</div>
        </div>
      </div>`;
  });

  html += '</div>';
  return html;
}

// Build leaderboard from all results
function buildLeaderboard(allResults) {
  const byStudent = {};
  allResults.forEach(r => {
    const key = (r.email || r.name || '').toLowerCase();
    if (!key) return;
    if (!byStudent[key]) {
      byStudent[key] = {
        name: r.name,
        email: r.email || '',
        picture: r.picture || '',
        results: [],
        totalScore: 0,
        quizzes: new Set()
      };
    }
    byStudent[key].results.push(r);
    byStudent[key].totalScore += r.percentage;
    byStudent[key].quizzes.add(r.quizId);
    // Keep latest name/picture
    if (r.picture) byStudent[key].picture = r.picture;
    if (r.name) byStudent[key].name = r.name;
  });

  return Object.values(byStudent)
    .map(s => ({
      name: s.name,
      email: s.email,
      picture: s.picture,
      avgScore: Math.round(s.totalScore / s.results.length),
      quizCount: s.quizzes.size,
      totalAttempts: s.results.length,
      bestScore: Math.max(...s.results.map(r => r.percentage))
    }))
    .sort((a, b) => b.avgScore - a.avgScore || b.quizCount - a.quizCount);
}
