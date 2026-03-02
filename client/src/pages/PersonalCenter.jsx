import { useState, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import Title from '../components/Title';
import toast from 'react-hot-toast';
import MyBooking from './MyBooking';

const TABS = [
  { id: 'info', label: '我的信息' },
  { id: 'orders', label: '我的订单' },
  { id: 'favorites', label: '我的收藏' },
  { id: 'reviews', label: '我的评价' },
];

function PersonalCenter() {
  const { isAuthenticated, navigate, getToken, axios, userInfo, setUserInfo, fetchUser } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'info';
  const [editForm, setEditForm] = useState({ username: '', birthday: '' });
  const [saving, setSaving] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [loadingFav, setLoadingFav] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const favScrollRef = useRef(null);
  const revScrollRef = useRef(null);

  const favVirtualizer = useVirtualizer({
    count: Math.ceil(favorites.length / 2),
    getScrollElement: () => favScrollRef.current,
    estimateSize: () => 110,
    overscan: 2,
  });

  const revVirtualizer = useVirtualizer({
    count: reviews.length,
    getScrollElement: () => revScrollRef.current,
    estimateSize: () => 180,
    overscan: 3,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setEditForm({
      username: userInfo?.username || '',
      birthday: userInfo?.birthday || '',
    });
  }, [userInfo]);

  useEffect(() => {
    if (tab === 'favorites' && isAuthenticated) {
      (async () => {
        setLoadingFav(true);
        try {
          const token = await getToken();
          const { data } = await axios.get('/api/users/favorites', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (data.success) setFavorites(data.hotels || []);
          else setFavorites([]);
        } catch {
          setFavorites([]);
        } finally {
          setLoadingFav(false);
        }
      })();
    }
  }, [tab, isAuthenticated, getToken, axios]);

  useEffect(() => {
    if (tab === 'reviews' && isAuthenticated) {
      (async () => {
        setLoadingReviews(true);
        try {
          const token = await getToken();
          const { data } = await axios.get('/api/reviews/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (data.success) setReviews(data.reviews || []);
          else setReviews([]);
        } catch {
          setReviews([]);
        } finally {
          setLoadingReviews(false);
        }
      })();
    }
  }, [tab, isAuthenticated, getToken, axios]);

  const setTab = (id) => setSearchParams({ tab: id });

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!editForm.username?.trim()) {
      toast.error('请输入用户名');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const fd = new FormData();
      fd.append('username', editForm.username.trim());
      fd.append('birthday', editForm.birthday || '');
      if (editForm.avatarFile) fd.append('avatar', editForm.avatarFile);
      const { data } = await axios.patch('/api/users/profile', fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setUserInfo({
          ...userInfo,
          username: data.username,
          avatar: data.avatar || userInfo?.avatar,
          birthday: data.birthday,
        });
        await fetchUser();
        toast.success('保存成功');
        setEditForm((f) => ({ ...f, avatarFile: null }));
      } else {
        toast.error(data.message || '保存失败');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <div className="pt-24 pb-16 px-4 md:px-16 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <Title title="个人中心" subtitle="管理您的个人信息、订单与收藏" />
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <div className="flex sm:flex-col gap-2 sm:w-48 shrink-0">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-gray-800 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {tab === 'info' && (
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">头像</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                      {editForm.avatarFile ? (
                        <img src={URL.createObjectURL(editForm.avatarFile)} alt="" className="w-full h-full object-cover" />
                      ) : userInfo?.avatar ? (
                        <img src={userInfo.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl text-gray-400 font-medium">{(editForm.username || '用')[0]}</span>
                      )}
                    </div>
                    <label className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50">
                      选择图片
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setEditForm((f) => ({ ...f, avatarFile: e.target.files?.[0] || null }))}
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-gray-800"
                    placeholder="请输入用户名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">生日</label>
                  <input
                    type="date"
                    value={editForm.birthday}
                    onChange={(e) => setEditForm((f) => ({ ...f, birthday: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-gray-800"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-lg bg-gray-800 text-white font-medium hover:bg-gray-700 disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </form>
            )}
            {tab === 'orders' && (
              <div>
                <MyBooking embedded />
              </div>
            )}
            {tab === 'favorites' && (
              <div>
                {loadingFav ? (
                  <p className="text-gray-500 py-8">加载中...</p>
                ) : favorites.length === 0 ? (
                  <p className="text-gray-500 py-8">暂无收藏，去酒店详情页添加收藏吧</p>
                ) : (
                  <div
                    ref={favScrollRef}
                    className="max-h-[60vh] overflow-y-auto overflow-x-hidden"
                  >
                    <div
                      style={{
                        height: `${favVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                      }}
                    >
                      {favVirtualizer.getVirtualItems().map((virtualRow) => {
                        const start = virtualRow.index * 2;
                        const rowHotels = favorites.slice(start, start + 2);
                        return (
                          <div
                            key={virtualRow.key}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4"
                          >
                            {rowHotels.map((h) => (
                              <div
                                key={h._id}
                                className="flex gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 relative group"
                              >
                                <div
                                  className="flex-1 flex gap-3 min-w-0 cursor-pointer"
                                  onClick={() => navigate(`/hotels/${h._id}`)}
                                >
                                  <img
                                    src={h.images?.[0] || 'https://via.placeholder.com/120x90?text=Hotel'}
                                    alt=""
                                    className="w-24 h-20 rounded-lg object-cover shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-gray-900 truncate">{h.name}</p>
                                    <p className="text-sm text-gray-500">{h.city}</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const token = await getToken();
                                      const { data } = await axios.delete(`/api/users/favorites/${h._id}`, {
                                        headers: { Authorization: `Bearer ${token}` },
                                      });
                                      if (data.success) {
                                        setUserInfo((prev) => ({ ...prev, favoriteHotels: data.favoriteHotels || [] }));
                                        setFavorites((prev) => prev.filter((x) => x._id !== h._id));
                                        toast.success('已取消收藏');
                                      }
                                    } catch (err) {
                                      toast.error(err.response?.data?.message || '操作失败');
                                    }
                                  }}
                                  className="absolute top-2 right-2 p-1.5 rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 text-sm"
                                  title="取消收藏"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            {tab === 'reviews' && (
              <div>
                {loadingReviews ? (
                  <p className="text-gray-500 py-8">加载中...</p>
                ) : reviews.length === 0 ? (
                  <p className="text-gray-500 py-8">暂无评价，完成入住后可在订单页对酒店进行评价</p>
                ) : (
                  <div
                    ref={revScrollRef}
                    className="max-h-[60vh] overflow-y-auto overflow-x-hidden"
                  >
                    <div
                      style={{
                        height: `${revVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                      }}
                    >
                      {revVirtualizer.getVirtualItems().map((virtualRow) => (
                        <div
                          key={virtualRow.key}
                          ref={revVirtualizer.measureElement}
                          data-index={virtualRow.index}
                          className="absolute left-0 top-0 w-full pb-4"
                          style={{
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          {(() => {
                            const r = reviews[virtualRow.index];
                            return (
                              <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/hotels/${r.hotel?._id || r.hotel}`)}
                                    className="font-medium text-gray-900 hover:text-gray-700 hover:underline"
                                  >
                                    {r.hotel?.name || '酒店'}
                                  </button>
                                  <span className="text-sm text-gray-500">
                                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString('zh-CN') : ''}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 mb-2">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <span key={star} className={star <= (r.rating || 0) ? 'text-amber-500' : 'text-gray-300'}>★</span>
                                  ))}
                                  <span className="text-sm text-gray-600 ml-1">{r.rating} 分</span>
                                </div>
                                <p className="text-gray-700 text-sm whitespace-pre-wrap">{r.comment}</p>
                                {r.images && r.images.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {r.images.map((url, i) => (
                                      <img key={i} src={url} alt="" className="w-16 h-16 rounded object-cover" />
                                    ))}
                                  </div>
                                )}
                                <div className="mt-2 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!window.confirm('确定删除这条评价？')) return;
                                      try {
                                        const token = await getToken();
                                        const { data } = await axios.delete(`/api/reviews/${r._id}`, {
                                          headers: { Authorization: `Bearer ${token}` },
                                        });
                                        if (data.success) {
                                          setReviews((prev) => prev.filter((x) => x._id !== r._id));
                                          toast.success('已删除');
                                        }
                                      } catch (err) {
                                        toast.error(err.response?.data?.message || '删除失败');
                                      }
                                    }}
                                    className="text-sm text-red-600 hover:text-red-700"
                                  >
                                    删除
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonalCenter;
