import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // 1. Total counts
    const ticketCount = await prisma.ticket.count();
    const improvementCount = await prisma.improvement.count();
    const debtCount = await prisma.debt.count();

    // 2. Count by Status
    const ticketStats = await prisma.ticket.groupBy({
      by: ['status'],
      _count: true,
    });

    const improvementStats = await prisma.improvement.groupBy({
      by: ['status'],
      _count: true,
    });

    const debtStats = await prisma.debt.groupBy({
      by: ['status'],
      _count: true,
    });

    // 3. Count by Analyst
    const analysts = await prisma.user.findMany({
      where: { role: 'ANALYST' },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            tickets: true,
            improvements: true,
            debts: true,
          }
        }
      }
    });

    res.json({
      totals: {
        tickets: ticketCount,
        improvements: improvementCount,
        debts: debtCount,
        grandTotal: ticketCount + improvementCount + debtCount
      },
      byStatus: {
        tickets: ticketStats,
        improvements: improvementStats,
        debts: debtStats,
      },
      byAnalyst: analysts
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
