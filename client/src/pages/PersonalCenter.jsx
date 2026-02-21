import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import Title from '../components/Title';
import toast from 'react-hot-toast';
import MyBooking from './MyBooking';

const TABS = [
  { id: 'info', label: '我的信息' },
  { id: 'orders', label: '我的订单' },
  { id: 'favorites', label: '我的收藏' },
];

function PersonalCenter() {
  const { isAuthenticated, navigate, getToken, axios, userInfo, setUserInfo, fetchUser } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'info';
  const [editForm, setEditForm] = useState({ username: '', birthday: '' });
  const [saving, setSaving] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [loadingFav, setLoadingFav] = useState(false);

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
                  <div className="grid gap-4 sm:grid-cols-2">
                    {favorites.map((h) => (
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
