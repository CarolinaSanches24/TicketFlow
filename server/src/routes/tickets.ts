import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRole, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Get all tickets
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const where = req.user?.role === 'ADMIN' ? {} : { analystId: req.user?.id };
    const tickets = await prisma.ticket.findMany({
      where,
      include: { analyst: { select: { name: true } } }
    });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create ticket (Admin only)
router.post('/', authenticateToken, authorizeRole(['ADMIN']), async (req, res) => {
  const { title, description, analystId } = req.body;
  try {
    const ticket = await prisma.ticket.create({
      data: { title, description, analystId }
    });
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update ticket status
router.patch('/:id/status', authenticateToken, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // Analyst can only update their own
    if (req.user?.role === 'ANALYST' && ticket.analystId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: { status }
    });
    res.json(updatedTicket);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update ticket (Admin only for full update/assignment)
router.put('/:id', authenticateToken, authorizeRole(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { title, description, analystId, status } = req.body;
  try {
    const ticket = await prisma.ticket.update({
      where: { id },
      data: { title, description, analystId, status }
    });
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
