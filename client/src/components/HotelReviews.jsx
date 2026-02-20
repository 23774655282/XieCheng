import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";
import { FaStar } from "react-icons/fa";

function HotelReviews({ hotelId }) {
    const { axios, isAuthenticated, getToken } = useAppContext();
    const [reviews, setReviews] = useState([]);
    const [avgRating, setAvgRating] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [hasCompletedBooking, setHasCompletedBooking] = useState(false);
    const [checkingBooking, setCheckingBooking] = useState(false);
    const [formData, setFormData] = useState({
        rating: 5,
        comment: "",
    });

    useEffect(() => {
        if (hotelId) {
            fetchReviews();
            if (isAuthenticated) {
                checkCompletedBooking();
            }
        }
    }, [hotelId, isAuthenticated]);

    const checkCompletedBooking = async () => {
        if (!isAuthenticated || !hotelId) return;
        try {
            setCheckingBooking(true);
            const token = await getToken();
            const { data } = await axios.get("/api/bookings/user", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (data.success && Array.isArray(data.bookings)) {
                const hasCompleted = data.bookings.some(
                    (b) =>
                        b.hotel?._id === hotelId || b.hotel === hotelId &&
                        b.isCompleted === true &&
                        b.status !== 'cancelled'
                );
                setHasCompletedBooking(hasCompleted);
            }
        } catch (error) {
            console.error("Error checking completed booking:", error);
            setHasCompletedBooking(false);
        } finally {
            setCheckingBooking(false);
        }
    };

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`/api/reviews/hotel/${hotelId}`);
            if (data.success) {
                setReviews(data.reviews || []);
                setAvgRating(data.avgRating || 0);
                setTotal(data.total || 0);
            }
        } catch (error) {
            console.error("Error fetching reviews:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            toast.error("请先登录");
            return;
        }

        if (!hasCompletedBooking) {
            toast.error("只有完成过该酒店订单的用户才能评价");
            return;
        }

        if (!formData.comment.trim()) {
            toast.error("请输入评论内容");
            return;
        }

        setSubmitting(true);
        try {
            const token = await getToken();
            const { data } = await axios.post(
                "/api/reviews",
                {
                    hotelId,
                    rating: formData.rating,
                    comment: formData.comment.trim(),
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (data.success) {
                toast.success("评论发表成功");
                setFormData({ rating: 5, comment: "" });
                setShowForm(false);
                fetchReviews();
                checkCompletedBooking(); // 重新检查，因为可能已经评价过了
            } else {
                toast.error(data.message || "发表评论失败");
            }
        } catch (error) {
            const message = error.response?.data?.message || "发表评论失败";
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const renderStars = (rating, interactive = false, onChange = null) => {
        return (
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type={interactive ? "button" : undefined}
                        onClick={interactive && onChange ? () => onChange(star) : undefined}
                        className={interactive ? "cursor-pointer" : "cursor-default"}
                        disabled={!interactive || submitting}
                    >
                        <FaStar
                            className={`w-4 h-4 ${
                                star <= rating
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-gray-300"
                            }`}
                        />
                    </button>
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow p-6 mb-6">
                <p className="text-gray-500">加载评论中...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 mb-1">用户评价</h2>
                    {total > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                            {renderStars(Math.round(avgRating))}
                            <span className="text-sm text-gray-600">
                                {avgRating.toFixed(1)} / 5.0
                            </span>
                            <span className="text-sm text-gray-500">（{total} 条评价）</span>
                        </div>
                    )}
                </div>
                {isAuthenticated && !showForm && (
                    <>
                        {checkingBooking ? (
                            <span className="text-sm text-gray-500">检查中...</span>
                        ) : hasCompletedBooking ? (
                            <button
                                type="button"
                                onClick={() => setShowForm(true)}
                                className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                写评价
                            </button>
                        ) : (
                            <span className="text-sm text-gray-500">完成订单后可评价</span>
                        )}
                    </>
                )}
            </div>

            {/* 评论表单 */}
            {showForm && isAuthenticated && (
                <form onSubmit={handleSubmit} className="mb-6 pb-6 border-b border-gray-200">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            评分
                        </label>
                        {renderStars(formData.rating, true, (rating) =>
                            setFormData({ ...formData, rating })
                        )}
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            评论内容
                        </label>
                        <textarea
                            value={formData.comment}
                            onChange={(e) =>
                                setFormData({ ...formData, comment: e.target.value })
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows="4"
                            placeholder="分享您的入住体验..."
                            disabled={submitting}
                            required
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? "提交中..." : "提交评价"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowForm(false);
                                setFormData({ rating: 5, comment: "" });
                            }}
                            disabled={submitting}
                            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            取消
                        </button>
                    </div>
                </form>
            )}

            {/* 评论列表 */}
            {reviews.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                    {isAuthenticated ? "暂无评价，成为第一个评价的用户吧！" : "暂无评价"}
                </p>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <div
                            key={review._id}
                            className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-gray-800">
                                            {review.user?.username || "匿名用户"}
                                        </span>
                                        {renderStars(review.rating)}
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        {formatDate(review.createdAt)}
                                    </p>
                                </div>
                            </div>
                            <p className="text-gray-700 text-sm leading-relaxed mt-2 whitespace-pre-line">
                                {review.comment}
                            </p>
                            {Array.isArray(review.images) && review.images.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {review.images.slice(0, 3).map((img, idx) => (
                                        <img
                                            key={idx}
                                            src={img}
                                            alt="评价图片"
                                            className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default HotelReviews;
