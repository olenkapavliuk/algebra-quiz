require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || 'math2024';

app.use(cors({
  origin: [
    'https://brobots-school-ua.github.io',
    'http://localhost:5173',
    'http://localhost:3000'
  ]
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// POST /api/results — save result (students, no auth)
app.post('/api/results', async (req, res) => {
  const { name, email, picture, quizId, quizTitle, score, total, percentage, mode, timeSpent, answers } = req.body;
  if (!name || score === undefined || !total || !quizId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const result = await prisma.result.create({
      data: {
        name,
        email: email || '',
        picture: picture || '',
        quizId,
        quizTitle: quizTitle || 'Квіз',
        score: Number(score),
        total: Number(total),
        percentage: percentage !== undefined ? Number(percentage) : Math.round((score / total) * 100),
        mode: mode || 'exam',
        timeSpent: timeSpent ? Number(timeSpent) : null,
        answers: answers || null,
      }
    });
    res.json({ success: true, id: result.id });
  } catch (e) {
    console.error('Save error:', e);
    res.status(500).json({ error: 'Failed to save' });
  }
});

// GET /api/results — all results (teacher only)
app.get('/api/results', async (req, res) => {
  if (req.headers['x-teacher-password'] !== TEACHER_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const results = await prisma.result.findMany({ orderBy: { date: 'desc' } });
    res.json(results.map(r => ({ ...r, date: r.date.toISOString() })));
  } catch (e) {
    res.status(500).json({ error: 'Failed to load' });
  }
});

// GET /api/results/my?email=... — student's own results
app.get('/api/results/my', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const results = await prisma.result.findMany({
      where: { email: { equals: email, mode: 'insensitive' } },
      orderBy: { date: 'desc' }
    });
    res.json(results.map(r => ({ ...r, date: r.date.toISOString() })));
  } catch (e) {
    res.status(500).json({ error: 'Failed to load' });
  }
});

// DELETE /api/results — clear all (teacher only)
app.delete('/api/results', async (req, res) => {
  if (req.headers['x-teacher-password'] !== TEACHER_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    await prisma.result.deleteMany();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to clear' });
  }
});

app.listen(PORT, () => console.log(`API server running on port ${PORT}`));
