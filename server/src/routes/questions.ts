import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, adminOnly } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();

// Get all questions for current user
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const questions = await prisma.question.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        answerer: {
          select: { name: true, email: true },
        },
      },
    });

    res.json({ success: true, data: questions });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch questions' });
  }
});

// Create question
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { question } = req.body;
    const userId = req.user!.userId;

    if (!question) {
      res.status(400).json({ success: false, error: 'Question is required' });
      return;
    }

    const newQuestion = await prisma.question.create({
      data: {
        userId,
        question,
        status: 'OPEN',
      },
    });

    res.status(201).json({ success: true, data: newQuestion });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ success: false, error: 'Failed to create question' });
  }
});

// Admin: Get all questions
router.get('/admin/all', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const questions = await prisma.question.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        answerer: { select: { name: true, email: true } },
      },
    });

    res.json({ success: true, data: questions });
  } catch (error) {
    console.error('Get all questions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch questions' });
  }
});

// Admin: Get open questions
router.get('/admin/open', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const questions = await prisma.question.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ success: true, data: questions });
  } catch (error) {
    console.error('Get open questions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch open questions' });
  }
});

// Admin: Answer question
router.patch('/:id/answer', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;
    const adminId = req.user!.userId;

    if (!answer) {
      res.status(400).json({ success: false, error: 'Answer is required' });
      return;
    }

    const question = await prisma.question.update({
      where: { id },
      data: {
        answer,
        answeredBy: adminId,
        answeredAt: new Date(),
        status: 'ANSWERED',
      },
      include: {
        user: { select: { name: true, email: true } },
        answerer: { select: { name: true, email: true } },
      },
    });

    res.json({ success: true, data: question });
  } catch (error) {
    console.error('Answer question error:', error);
    res.status(500).json({ success: false, error: 'Failed to answer question' });
  }
});

export default router;
