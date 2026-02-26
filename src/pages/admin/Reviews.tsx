import { useState, useEffect } from "react";
import { Star, Eye, EyeOff, Trash2, Search, Filter } from "lucide-react";
import { reviewsService } from "@/lib/reviewsService";
import { Review } from "@/types/reviews";
import { toast } from "sonner";

const AdminReviews = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "visible" | "hidden">("all");

    const loadReviews = async () => {
        try {
            setIsLoading(true);
            const data = await reviewsService.getReviews({ limit: 100, includeHidden: true });
            setReviews(data);
        } catch (error) {
            toast.error("Failed to load reviews");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadReviews();
    }, []);

    const toggleVisibility = async (id: string, currentHidden: boolean) => {
        try {
            await reviewsService.toggleReviewVisibility(id, !currentHidden);
            toast.success(currentHidden ? "Review published" : "Review hidden");
            loadReviews();
        } catch (error) {
            toast.error("Action failed");
        }
    };

    const deleteReview = async (id: string) => {
        if (!confirm("Are you sure you want to delete this review?")) return;
        try {
            await reviewsService.deleteReview(id);
            toast.success("Review deleted");
            loadReviews();
        } catch (error) {
            toast.error("Delete failed");
        }
    };

    const filteredReviews = reviews.filter((r) => {
        const matchesSearch = r.userName.toLowerCase().includes(search.toLowerCase()) ||
            r.body.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === "all" ||
            (filter === "visible" && !r.isHidden) ||
            (filter === "hidden" && r.isHidden);
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 font-outfit">Review Moderation</h1>
                <p className="text-sm text-gray-600 mt-1">Manage, approve, or hide customer reviews.</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 flex flex-wrap gap-4 items-center shadow-sm">
                <div className="relative flex-1 min-w-[250px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        className="w-full h-10 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                        placeholder="Search by name or content..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {(["all", "visible", "hidden"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredReviews.map((review) => (
                        <div
                            key={review.id}
                            className={`bg-white p-6 rounded-xl border transition-all duration-200 shadow-sm flex flex-col md:flex-row gap-6 items-start ${review.isHidden ? "opacity-75 border-gray-200 grayscale-[0.5]" : "border-gray-200 hover:border-gray-300"
                                }`}
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-100">
                                        {review.userAvatarUrl ? (
                                            <img src={review.userAvatarUrl} alt={review.userName} className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="text-gray-400 font-bold">{review.userName[0]}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 font-outfit">{review.userName}</h3>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                                            ))}
                                        </div>
                                    </div>
                                    <span className="ml-auto text-xs text-gray-400">
                                        {new Date(review.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-gray-600 text-sm italic leading-relaxed">"{review.body}"</p>
                                {review.isHidden && (
                                    <span className="inline-flex items-center gap-1 mt-3 px-2 py-0.5 rounded bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                        <EyeOff className="h-2.5 w-2.5" /> Hidden from Public
                                    </span>
                                )}
                            </div>

                            <div className="flex md:flex-col gap-2 shrink-0 self-center md:self-start">
                                <button
                                    onClick={() => toggleVisibility(review.id, !!review.isHidden)}
                                    className={`flex items-center justify-center h-10 w-10 rounded-lg transition-all duration-200 ${review.isHidden
                                            ? "bg-green-50 text-green-600 hover:bg-green-100"
                                            : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                                        }`}
                                    title={review.isHidden ? "Publish" : "Hide"}
                                >
                                    {review.isHidden ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                                </button>
                                <button
                                    onClick={() => deleteReview(review.id)}
                                    className="flex items-center justify-center h-10 w-10 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all duration-200"
                                    title="Delete"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {filteredReviews.length === 0 && (
                        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <Filter className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No reviews found matching your criteria.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminReviews;
