import { Router, Request, Response } from 'express';
import { Hotel } from '../models/Hotel.js';

const router = Router();

// 用户端仅返回 status = online 的酒店
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      city,
      keyword,
      star,
      priceMin,
      priceMax,
      tags,
      page = 1,
      pageSize = 10,
    } = req.query;

    const filter: Record<string, unknown> = { status: 'online' };

    if (city && typeof city === 'string') {
      filter.address = { $regex: city, $options: 'i' };
    }
    if (keyword && typeof keyword === 'string') {
      filter.$or = [
        { nameZh: { $regex: keyword, $options: 'i' } },
        { nameEn: { $regex: keyword, $options: 'i' } },
        { address: { $regex: keyword, $options: 'i' } },
        { tags: { $regex: keyword, $options: 'i' } },
      ];
    }
    if (star != null) {
      filter.star = Number(star);
    }
    if (priceMin != null || priceMax != null) {
      filter['roomTypes.price'] = {};
      if (priceMin != null) (filter['roomTypes.price'] as Record<string, number>).$gte = Number(priceMin);
      if (priceMax != null) (filter['roomTypes.price'] as Record<string, number>).$lte = Number(priceMax);
    }
    if (tags && typeof tags === 'string') {
      const tagArr = tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (tagArr.length) filter.tags = { $in: tagArr };
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const [list, total] = await Promise.all([
      Hotel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(Number(pageSize)).lean(),
      Hotel.countDocuments(filter),
    ]);

    const minPrice = (h: { roomTypes?: { price: number }[] }) => {
      const prices = h.roomTypes?.map((r) => r.price).filter((p) => p != null) ?? [];
      return prices.length ? Math.min(...prices) : 0;
    };

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
          minPrice: minPrice(h),
          tags: h.tags ?? [],
          images: h.images ?? [],
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

router.get('/:id/rooms', async (req: Request, res: Response) => {
  try {
    const hotel = await Hotel.findOne({ _id: req.params.id, status: 'online' }).lean();
    if (!hotel) {
      return res.status(404).json({ code: 404, message: '酒店不存在或未上线' });
    }
    const rooms = (hotel.roomTypes ?? []).slice().sort((a, b) => a.price - b.price);
    res.json({
      code: 0,
      message: 'ok',
      data: {
        list: rooms.map((r) => ({ name: r.name, price: r.price, stock: r.stock ?? 0 })),
      },
    });
  } catch (e) {
    res.status(500).json({ code: 500, message: (e as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const hotel = await Hotel.findOne({ _id: req.params.id, status: 'online' }).lean();
    if (!hotel) {
      return res.status(404).json({ code: 404, message: '酒店不存在或未上线' });
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
        tags: hotel.tags ?? [],
        images: hotel.images ?? [],
        nearby: hotel.nearby ?? { spots: [], traffic: [], malls: [] },
      },
    });
  } catch (e) {
    res.status(500).json({ code: 500, message: (e as Error).message });
  }
});

export default router;
