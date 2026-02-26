import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRole, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Get all debts
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const where = req.user?.role === 'ADMIN' ? {} : { analystId: req.user?.id };
    const debts = await prisma.debt.findMany({
      where,
      include: { analyst: { select: { name: true } } }
    });
    res.json(debts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create debt (Admin only)
router.post('/', authenticateToken, authorizeRole(['ADMIN']), async (req, res) => {
  const { description, analystId, originType, originId } = req.body;
  try {
    const debt = await prisma.debt.create({
      data: { description, analystId, originType, originId }
    });
    res.status(201).json(debt);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update status
router.patch('/:id/status', authenticateToken, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const debt = await prisma.debt.findUnique({ where: { id } });
    if (!debt) return res.status(404).json({ message: 'Debt not found' });

    if (req.user?.role === 'ANALYST' && debt.analystId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updated = await prisma.debt.update({
      where: { id },
      data: { status }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
