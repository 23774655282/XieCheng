/**
 * 管理端 - 酒店表单（新建/编辑复用）
 */
import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { merchantApi } from '../../api';
import { useAuth } from '../../context/AuthContext';

interface RoomType {
  name: string;
  price: number;
  stock?: number;
}

interface HotelFormProps {
  hotelId?: string;
  onSuccess?: (id?: string) => void;
}

export default function HotelForm({ hotelId, onSuccess }: HotelFormProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canEdit, setCanEdit] = useState(true);
  const [canSubmit, setCanSubmit] = useState(false);

  const [nameZh, setNameZh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [address, setAddress] = useState('');
  const [star, setStar] = useState(3);
  const [openedAt, setOpenedAt] = useState('');
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([{ name: '', price: 0 }]);

  useEffect(() => {
    if (!hotelId || !token) return;
    merchantApi
      .getHotel(hotelId, token)
      .then((res) => {
        if (res.code === 0 && res.data) {
          const d = res.data;
          setNameZh(d.nameZh);
          setNameEn(d.nameEn);
          setAddress(d.address);
          setStar(d.star);
          setOpenedAt(d.openedAt ? new Date(d.openedAt).toISOString().slice(0, 10) : '');
          setRoomTypes(
            d.roomTypes?.length
              ? d.roomTypes.map((r) => ({ name: r.name, price: r.price, stock: r.stock ?? 0 }))
              : [{ name: '', price: 0 }]
          );
          setCanEdit(['draft', 'rejected'].includes(d.status));
          setCanSubmit(['draft', 'rejected'].includes(d.status));
        }
      })
      .catch(() => setError('加载失败'));
  }, [hotelId, token]);

  const addRoom = () => setRoomTypes((r) => [...r, { name: '', price: 0 }]);
  const removeRoom = (i: number) => setRoomTypes((r) => r.filter((_, j) => j !== i));
  const updateRoom = (i: number, field: keyof RoomType, val: string | number) => {
    setRoomTypes((r) => r.map((x, j) => (j === i ? { ...x, [field]: val } : x)));
  };

  const getPayload = () => ({
    nameZh: nameZh.trim(),
    nameEn: nameEn.trim(),
    address: address.trim(),
    star: Number(star),
    openedAt: openedAt || new Date().toISOString().slice(0, 10),
    roomTypes: roomTypes
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name.trim(), price: Number(r.price) || 0, stock: r.stock ?? 0 })),
  });

  const handleSaveDraft = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const payload = getPayload();
    if (!payload.nameZh || !payload.nameEn || !payload.address) {
      setError('请填写中文名、英文名、地址');
      return;
    }
    if (payload.roomTypes.length === 0) {
      setError('至少添加一个房型');
      return;
    }
    if (!token) return;
    setLoading(true);
    try {
      if (hotelId) {
        const res = await merchantApi.updateHotel(hotelId, payload, token);
        if (res.code === 0) onSuccess?.();
      } else {
        const res = await merchantApi.createHotel(payload, token);
        if (res.code === 0 && res.data) onSuccess?.(res.data.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!hotelId) return;
    setError('');
    const payload = getPayload();
    if (!payload.nameZh || !payload.nameEn || !payload.address) {
      setError('请填写中文名、英文名、地址');
      return;
    }
    if (payload.roomTypes.length === 0) {
      setError('至少添加一个房型');
      return;
    }
    if (!token) return;
    setLoading(true);
    try {
      await merchantApi.updateHotel(hotelId, payload, token);
      const res = await merchantApi.submitHotel(hotelId, token);
      if (res.code === 0) onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="hotel-form"
      onSubmit={handleSaveDraft}
      style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 600 }}
    >
      {error && <p style={{ color: '#ff4d4f' }}>{error}</p>}
      <input
        name="nameZh"
        placeholder="中文名 *"
        value={nameZh}
        onChange={(e) => setNameZh(e.target.value)}
        disabled={!canEdit}
        style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
      />
      <input
        name="nameEn"
        placeholder="英文名 *"
        value={nameEn}
        onChange={(e) => setNameEn(e.target.value)}
        disabled={!canEdit}
        style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
      />
      <input
        name="address"
        placeholder="地址 *"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        disabled={!canEdit}
        style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
      />
      <input
        name="star"
        type="number"
        placeholder="星级 1-5"
        min={1}
        max={5}
        value={star}
        onChange={(e) => setStar(Number(e.target.value))}
        disabled={!canEdit}
        style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
      />
      <input
        name="openedAt"
        type="date"
        value={openedAt}
        onChange={(e) => setOpenedAt(e.target.value)}
        disabled={!canEdit}
        style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
      />
      <div>
        <div style={{ marginBottom: 8 }}>房型 *</div>
        {roomTypes.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input
              placeholder="房型名称"
              value={r.name}
              onChange={(e) => updateRoom(i, 'name', e.target.value)}
              disabled={!canEdit}
              style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
            />
            <input
              type="number"
              placeholder="价格"
              value={r.price || ''}
              onChange={(e) => updateRoom(i, 'price', Number(e.target.value))}
              disabled={!canEdit}
              style={{ width: 100, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
            />
            <button type="button" onClick={() => removeRoom(i)} disabled={!canEdit || roomTypes.length === 1}>
              删除
            </button>
          </div>
        ))}
        <button type="button" onClick={addRoom} disabled={!canEdit} style={{ padding: '0.5rem', fontSize: 14 }}>
          + 添加房型
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          disabled={loading || !canEdit}
          style={{ padding: 8, background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 6 }}
        >
          {loading ? '保存中...' : '保存草稿'}
        </button>
        {hotelId && canSubmit && (
          <button
            type="button"
            onClick={handleSubmitForReview}
            disabled={loading}
            style={{ padding: 8, background: '#1677ff', color: '#fff', border: 'none', borderRadius: 6 }}
          >
            {loading ? '提交中...' : '提交审核'}
          </button>
        )}
      </div>
    </form>
  );
}
