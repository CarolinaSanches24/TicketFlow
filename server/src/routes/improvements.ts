import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRole, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Get all improvements
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const where = req.user?.role === 'ADMIN' ? {} : { analystId: req.user?.id };
    const improvements = await prisma.improvement.findMany({
      where,
      include: { analyst: { select: { name: true } } }
    });
    res.json(improvements);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create improvement (Admin only)
router.post('/', authenticateToken, authorizeRole(['ADMIN']), async (req, res) => {
  const { title, description, analystId } = req.body;
  try {
    const improvement = await prisma.improvement.create({
      data: { title, description, analystId }
    });
    res.status(201).json(improvement);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update status
router.patch('/:id/status', authenticateToken, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const improvement = await prisma.improvement.findUnique({ where: { id } });
    if (!improvement) return res.status(404).json({ message: 'Improvement not found' });

    if (req.user?.role === 'ANALYST' && improvement.analystId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updated = await prisma.improvement.update({
      where: { id },
      data: { status }
    });

    // Handle conversion to debt
    if (status === 'CONVERTED_TO_DEBT') {
      await prisma.debt.create({
        data: {
          originType: 'IMPROVEMENT',
          originId: id,
          description: `Converted from Improvement: ${improvement.title}`,
          analystId: improvement.analystId,
        }
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
