import { Router, Request, Response } from 'express';
import { Hotel } from '../models/Hotel.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/hotels', async (req: Request, res: Response) => {
  try {
    const { status, page = 1, pageSize = 10 } = req.query;
    const filter: Record<string, unknown> = {};
    if (status && typeof status === 'string') {
      filter.status = status;
    }
    const skip = (Number(page) - 1) * Number(pageSize);
    const [list, total] = await Promise.all([
      Hotel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(Number(pageSize)).lean(),
      Hotel.countDocuments(filter),
    ]);
    res.json({
      code: 0,
      message: 'ok',
      data: {
        list: list.map((h) => ({
          id: h._id.toString(),
          nameZh: h.nameZh,
          nameEn: h.nameEn,
          address: h.address,
          star: h.star,
          status: h.status,
          rejectReason: h.rejectReason,
          merchantId: h.merchantId?.toString(),
        })),
        page: Number(page),
        pageSize: Number(pageSize),
        total,
      },
    });
  } catch (e) {
    res.status(500).json({ code: 500, message: (e as Error).message });
  }
});

router.get('/hotels/:id', async (req: Request, res: Response) => {
  try {
    const hotel = await Hotel.findById(req.params.id).lean();
    if (!hotel) return res.status(404).json({ code: 404, message: '酒店不存在' });
    res.json({
      code: 0,
      message: 'ok',
      data: {
        id: hotel._id.toString(),
        nameZh: hotel.nameZh,
        nameEn: hotel.nameEn,
        address: hotel.address,
        star: hotel.star,
        openedAt: hotel.openedAt,
        roomTypes: hotel.roomTypes,
        status: hotel.status,
        rejectReason: hotel.rejectReason,
        merchantId: hotel.merchantId?.toString(),
      },
    });
  } catch (e) {
    res.status(500).json({ code: 500, message: (e as Error).message });
  }
});

router.post('/hotels/:id/approve', async (req: Request, res: Response) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ code: 404, message: '酒店不存在' });
    if (hotel.status !== 'pending') {
      return res.status(400).json({ code: 400, message: '仅待审核状态可通过' });
    }
    hotel.status = 'approved';
    hotel.rejectReason = undefined;
    await hotel.save();
    res.json({ code: 0, message: 'ok', data: { id: hotel._id.toString(), status: hotel.status } });
  } catch (e) {
    res.status(500).json({ code: 500, message: (e as Error).message });
  }
});

router.post('/hotels/:id/reject', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body as { reason?: string };
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ code: 400, message: '缺少 reason 或 reason 为空' });
    }
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ code: 404, message: '酒店不存在' });
    if (hotel.status !== 'pending') {
      return res.status(400).json({ code: 400, message: '仅待审核状态可拒绝' });
    }
    hotel.status = 'rejected';
    hotel.rejectReason = reason.trim();
    await hotel.save();
    res.json({ code: 0, message: 'ok', data: { id: hotel._id.toString(), status: hotel.status } });
  } catch (e) {
    res.status(500).json({ code: 500, message: (e as Error).message });
  }
});

router.post('/hotels/:id/publish', async (req: Request, res: Response) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ code: 404, message: '酒店不存在' });
    if (hotel.status !== 'approved') {
      return res.status(400).json({ code: 400, message: '仅已通过状态可发布' });
    }
    hotel.status = 'online';
    await hotel.save();
    res.json({ code: 0, message: 'ok', data: { id: hotel._id.toString(), status: hotel.status } });
  } catch (e) {
    res.status(500).json({ code: 500, message: (e as Error).message });
  }
});

router.post('/hotels/:id/offline', async (req: Request, res: Response) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ code: 404, message: '酒店不存在' });
    if (hotel.status !== 'online') {
      return res.status(400).json({ code: 400, message: '仅已上线状态可下线' });
    }
    hotel.status = 'offline';
    await hotel.save();
    res.json({ code: 0, message: 'ok', data: { id: hotel._id.toString(), status: hotel.status } });
  } catch (e) {
    res.status(500).json({ code: 500, message: (e as Error).message });
  }
});

router.post('/hotels/:id/restore', async (req: Request, res: Response) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ code: 404, message: '酒店不存在' });
    if (hotel.status !== 'offline') {
      return res.status(400).json({ code: 400, message: '仅已下线状态可恢复' });
    }
    hotel.status = 'online';
    await hotel.save();
    res.json({ code: 0, message: 'ok', data: { id: hotel._id.toString(), status: hotel.status } });
  } catch (e) {
    res.status(500).json({ code: 500, message: (e as Error).message });
  }
});

export default router;
