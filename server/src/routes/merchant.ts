import { Router, Request, Response } from 'express';
import { Hotel } from '../models/Hotel.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('merchant'));

router.post('/hotels', async (req: Request, res: Response) => {
  try {
    const { nameZh, nameEn, address, star, openedAt, roomTypes } = req.body;
    if (!nameZh || !nameEn || !address || star == null || !openedAt || !Array.isArray(roomTypes)) {
      return res.status(400).json({ code: 400, message: '缺少必填字段' });
    }
    if (roomTypes.length === 0) {
      return res.status(400).json({ code: 400, message: '至少需要一个房型' });
    }
    const hotel = await Hotel.create({
      nameZh,
      nameEn,
      address,
      star: Number(star),
      openedAt: new Date(openedAt),
      roomTypes: roomTypes.map((r: { name: string; price: number; stock?: number }) => ({
        name: r.name,
        price: Number(r.price),
        stock: r.stock ?? 0,
      })),
      status: 'draft',
      merchantId: req.user!.userId,
    });
    res.json({
      code: 0,
      message: 'ok',
      data: { id: hotel._id.toString(), status: hotel.status },
    });
  } catch (e) {
    res.status(500).json({ code: 500, message: (e as Error).message });
  }
});

router.get('/hotels', async (req: Request, res: Response) => {
  try {
    const { status, page = 1, pageSize = 10 } = req.query;
    const filter: Record<string, unknown> = { merchantId: req.user!.userId };
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
    const hotel = await Hotel.findOne({
      _id: req.params.id,
      merchantId: req.user!.userId,
    }).lean();
    if (!hotel) {
      return res.status(404).json({ code: 404, message: '酒店不存在或无权操作' });
    }
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
      },
    });
  } catch (e) {
    res.status(500).json({ code: 500, message: (e as Error).message });
  }
});

router.put('/hotels/:id', async (req: Request, res: Response) => {
  try {
    const hotel = await Hotel.findOne({
      _id: req.params.id,
      merchantId: req.user!.userId,
    });
    if (!hotel) {
      return res.status(404).json({ code: 404, message: '酒店不存在或无权操作' });
    }
    if (!['draft', 'rejected'].includes(hotel.status)) {
      return res.status(400).json({ code: 400, message: '仅草稿或已驳回状态可编辑' });
    }
    const { nameZh, nameEn, address, star, openedAt, roomTypes } = req.body;
    if (nameZh != null) hotel.nameZh = nameZh;
    if (nameEn != null) hotel.nameEn = nameEn;
    if (address != null) hotel.address = address;
    if (star != null) hotel.star = Number(star);
    if (openedAt != null) hotel.openedAt = new Date(openedAt);
    if (Array.isArray(roomTypes) && roomTypes.length > 0) {
      hotel.roomTypes = roomTypes.map((r: { name: string; price: number; stock?: number }) => ({
        name: r.name,
        price: Number(r.price),
        stock: r.stock ?? 0,
      })) as typeof hotel.roomTypes;
    }
    await hotel.save();
    res.json({
      code: 0,
      message: 'ok',
      data: { id: hotel._id.toString(), status: hotel.status },
    });
  } catch (e) {
    res.status(500).json({ code: 500, message: (e as Error).message });
  }
});

router.post('/hotels/:id/submit', async (req: Request, res: Response) => {
  try {
    const hotel = await Hotel.findOne({
      _id: req.params.id,
      merchantId: req.user!.userId,
    });
    if (!hotel) {
      return res.status(404).json({ code: 404, message: '酒店不存在或无权操作' });
    }
    if (!['draft', 'rejected'].includes(hotel.status)) {
      return res.status(400).json({ code: 400, message: '仅草稿或已驳回状态可提交审核' });
    }
    hotel.status = 'pending';
    hotel.rejectReason = undefined;
    await hotel.save();
    res.json({
      code: 0,
      message: 'ok',
      data: { id: hotel._id.toString(), status: hotel.status },
    });
  } catch (e) {
    res.status(500).json({ code: 500, message: (e as Error).message });
  }
});

export default router;
