import { useState, useEffect, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { FaStar } from "react-icons/fa";

/** 优点标签定义：标签名 -> 匹配规则（关键词或函数） */
const TAG_DEFINITIONS = [
    { key: "recommended", label: "值得推荐", match: (r) => /推荐|不错|满意|好评/i.test(r.comment || "") },
    { key: "hasImages", label: "有图", match: (r) => Array.isArray(r.images) && r.images.length > 0 },
    { key: "location", label: "位置佳", match: (r) => /位置|地段|地理位置|方便|便利/i.test(r.comment || "") },
    { key: "quiet", label: "噪音小", match: (r) => /安静|静谧|噪音小|隔音/i.test(r.comment || "") },
    { key: "service", label: "服务好", match: (r) => /服务|热情|贴心|周到/i.test(r.comment || "") },
    { key: "frontDesk", label: "前台热情", match: (r) => /前台/i.test(r.comment || "") },
    { key: "transport", label: "交通便利", match: (r) => /交通|地铁|公交|出行/i.test(r.comment || "") },
    { key: "subway", label: "近地铁站", match: (r) => /地铁|地铁站/i.test(r.comment || "") },
    { key: "breakfast", label: "早餐很棒", match: (r) => /早餐/i.test(r.comment || "") },
    { key: "kids", label: "适合带娃", match: (r) => /带娃|孩子|亲子|儿童/i.test(r.comment || "") },
    { key: "pool", label: "泳池干净", match: (r) => /泳池/i.test(r.comment || "") },
    { key: "badReview", label: "差评", match: (r) => (r.rating || 0) <= 2 },
];

const MIN_TAG_COUNT = 20;
const MAX_DISPLAY_COUNT = 999;

function HotelReviews({ hotelId }) {
    const { axios } = useAppContext();
    const [reviews, setReviews] = useState([]);
    const [avgRating, setAvgRating] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeTag, setActiveTag] = useState(null); // key of selected tag for filtering

    useEffect(() => {
        if (hotelId) fetchReviews();
    }, [hotelId]);

    const fetchReviews = async (limit = 100, silent = false) => {
        try {
            if (!silent) setLoading(true);
            const { data } = await axios.get(`/api/reviews/hotel/${hotelId}`, {
                params: { page: 1, limit },
            });
            if (data.success) {
                setReviews(data.reviews || []);
                setAvgRating(data.avgRating || 0);
                setTotal(data.total || 0);
            }
        } catch (error) {
            console.error("Error fetching reviews:", error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    /** 计算各标签数量，仅保留 >= 20 的，展示时 999+ 为上限 */
    const tagCounts = useMemo(() => {
        const counts = {};
        TAG_DEFINITIONS.forEach(({ key, match }) => {
            const count = reviews.filter(match).length;
            if (count >= MIN_TAG_COUNT) counts[key] = count;
        });
        return counts;
    }, [reviews]);

    const formatTagCount = (n) => (n > MAX_DISPLAY_COUNT ? "999+" : String(n));

    /** 根据当前选中的标签筛选评价 */
    const filteredReviews = useMemo(() => {
        if (!activeTag) return reviews;
        const def = TAG_DEFINITIONS.find((t) => t.key === activeTag);
        if (!def) return reviews;
        return reviews.filter(def.match);
    }, [reviews, activeTag]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const renderStars = (rating) => (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <FaStar
                    key={star}
                    className={`w-3.5 h-3.5 ${
                        star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                    }`}
                />
            ))}
        </div>
    );

    const renderReviewItem = (review) => (
        <div
            key={review._id}
            className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0"
        >
            <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 text-sm">
                        {review.user?.username || "匿名用户"}
                    </span>
                    {renderStars(review.rating)}
                </div>
                <p className="text-xs text-gray-500">{formatDate(review.createdAt)}</p>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed mt-1 whitespace-pre-line">
                {review.comment}
            </p>
            {Array.isArray(review.images) && review.images.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {review.images.slice(0, 3).map((img, idx) => (
                        <img
                            key={idx}
                            src={img}
                            alt=""
                            className="w-16 h-16 rounded object-cover border border-gray-200"
                        />
                    ))}
                </div>
            )}
        </div>
    );

    const previewCount = 3;
    const previewReviews = filteredReviews.slice(0, previewCount);

    if (loading) {
        return (
            <div className="bg-white rounded-xl p-4 mb-4" style={{ boxShadow: '0 0 20px rgba(0,0,0,0.12)' }}>
                <p className="text-gray-500 text-sm">加载评论中...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl p-4 mb-4" style={{ boxShadow: '0 0 20px rgba(0,0,0,0.12)' }}>
            <div className="flex items-center justify-between mb-3 bg-black text-white -mx-4 -mt-4 px-4 py-3 rounded-t-xl">
                <div>
                    <h2 className="text-base font-semibold">用户评价</h2>
                    {total > 0 && (
                        <div className="flex items-center gap-2 mt-1 text-white/90">
                            {renderStars(Math.round(avgRating))}
                            <span className="text-sm">
                                {avgRating.toFixed(1)} / 5.0
                            </span>
                            <span className="text-sm text-white/70">（{total} 条）</span>
                        </div>
                    )}
                </div>
                {total > 0 && (
                    <button
                        type="button"
                        onClick={() => {
                            setDrawerOpen(true);
                            setActiveTag(null);
                            if (reviews.length < total) fetchReviews(100, true);
                        }}
                        className="px-3 py-1.5 text-sm text-white border border-white/60 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        查看更多评价
                    </button>
                )}
            </div>

            {/* 优点标签：数量 >= 20 才显示，999+ 为上限 */}
            {Object.keys(tagCounts).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    <button
                        type="button"
                        onClick={() => setActiveTag(null)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            !activeTag
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                    >
                        所有点评 ({total})
                    </button>
                    {TAG_DEFINITIONS.filter((t) => tagCounts[t.key] != null).map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => setActiveTag(activeTag === t.key ? null : t.key)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                activeTag === t.key
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            {t.label} ({formatTagCount(tagCounts[t.key])})
                        </button>
                    ))}
                </div>
            )}

            {/* 主区域：仅展示前几条，高度降低 */}
            {reviews.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">暂无评价</p>
            ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                    {(activeTag ? filteredReviews : previewReviews).slice(0, previewCount).map(renderReviewItem)}
                </div>
            )}

            {/* 侧边抽屉：全部评价 */}
            {drawerOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/40 z-40"
                        onClick={() => setDrawerOpen(false)}
                        aria-hidden="true"
                    />
                    <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800">全部评价</h3>
                            <button
                                type="button"
                                onClick={() => setDrawerOpen(false)}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                ✕
                            </button>
                        </div>
                        {/* 抽屉内标签筛选 */}
                        <div className="flex flex-wrap gap-2 p-4 border-b border-gray-100 bg-gray-50">
                            <button
                                type="button"
                                onClick={() => setActiveTag(null)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                    !activeTag ? "bg-blue-100 text-blue-700" : "bg-white text-gray-600 border border-gray-200"
                                }`}
                            >
                                所有 ({total})
                            </button>
                            {TAG_DEFINITIONS.filter((t) => tagCounts[t.key] != null).map((t) => (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => setActiveTag(activeTag === t.key ? null : t.key)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                        activeTag === t.key ? "bg-blue-100 text-blue-700" : "bg-white text-gray-600 border border-gray-200"
                                    }`}
                                >
                                    {t.label} ({formatTagCount(tagCounts[t.key])})
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {filteredReviews.length === 0 ? (
                                <p className="text-gray-500 text-sm">暂无符合条件的评价</p>
                            ) : (
                                filteredReviews.map(renderReviewItem)
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default HotelReviews;
