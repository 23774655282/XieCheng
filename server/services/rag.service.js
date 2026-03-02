/**
 * RAG 服务：房间文档构建、向量检索、推荐理由生成
 * - 从 Hotel + Room 数据生成可检索文档
 * - 使用 Embedding API 做语义检索
 * - 一致性：仅索引已审核、可预订的房间
 */

import OpenAI from "openai";
import Room from "../models/room.model.js";
import Hotel from "../models/hotel.model.js";

const roomTypeToCn = { "Single Bed": "单人间", "Double Bed": "双人间", "Luxury Room": "豪华房", "Family Suite": "家庭套房" };

/** 从房间+酒店数据生成可检索文档文本 */
export function roomToDocument(room) {
  const hotel = room.hotel;
  const parts = [
    hotel?.name || "",
    hotel?.city || "",
    hotel?.address || "",
    hotel?.district || "",
    hotel?.starRating ? `${hotel.starRating}星级` : "",
    (hotel?.hotelIntro || "").trim(),
    (hotel?.nearbyAttractions || []).join(" "),
    (hotel?.promotions || []).join(" "),
    roomTypeToCn[room.roomType] || room.roomType,
    room.pricePerNight ? `每晚${room.pricePerNight}元` : "",
    (room.amenties || []).join(" "),
  ];
  return parts.filter(Boolean).join(" ");
}

/** 余弦相似度 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

/** 获取 embedding（支持 OpenAI / DeepSeek 等兼容 API） */
async function getEmbedding(client, model, text) {
  const input = String(text || "").trim().slice(0, 8000);
  if (!input) return null;
  const res = await client.embeddings.create({
    model,
    input,
  });
  const vec = res?.data?.[0]?.embedding;
  return Array.isArray(vec) ? vec : null;
}

/** 内存向量索引：{ roomId, vector, text }[] */
let vectorIndex = [];
let indexBuiltAt = null;
const INDEX_TTL_MS = 15 * 60 * 1000; // 15 分钟缓存

/** 构建向量索引（仅已审核、可预订的房间） */
export async function buildVectorIndex(apiKey, baseURL, embeddingModel) {
  if (!apiKey) return false;
  try {
    const client = new OpenAI({ apiKey, baseURL });
    const hotelFilter = { status: "approved" };
    const approvedHotelIds = await Hotel.find(hotelFilter).distinct("_id").then((ids) => ids.map((id) => id.toString()));
    const roomFilter = {
      isAvailable: true,
      hotel: { $in: approvedHotelIds },
      status: { $ne: "pending_audit" },
    };
    const rooms = await Room.find(roomFilter).populate("hotel").lean();
    if (rooms.length === 0) {
      vectorIndex = [];
      indexBuiltAt = Date.now();
      return true;
    }
    const batchSize = 50;
    const index = [];
    for (let i = 0; i < rooms.length; i += batchSize) {
      const batch = rooms.slice(i, i + batchSize);
      const texts = batch.map((r) => roomToDocument(r));
      const res = await client.embeddings.create({
        model: embeddingModel,
        input: texts,
      });
      const embeddings = res?.data || [];
      batch.forEach((room, j) => {
        const vec = embeddings[j]?.embedding;
        if (Array.isArray(vec)) {
          index.push({
            roomId: room._id.toString(),
            room: room,
            vector: vec,
            text: texts[j],
          });
        }
      });
    }
    vectorIndex = index;
    indexBuiltAt = Date.now();
    return true;
  } catch (err) {
    console.error("[RAG] buildVectorIndex error:", err?.message);
    return false;
  }
}

/** 语义检索：返回与 query 最相似的 topK 个房间 */
export async function searchSimilarRooms(query, topK = 30, apiKey, baseURL, embeddingModel) {
  if (!apiKey || !query?.trim()) return [];
  const needsRebuild = !indexBuiltAt || Date.now() - indexBuiltAt > INDEX_TTL_MS;
  if (vectorIndex.length === 0 || needsRebuild) {
    const ok = await buildVectorIndex(apiKey, baseURL, embeddingModel);
    if (!ok || vectorIndex.length === 0) return [];
  }
  try {
    const client = new OpenAI({ apiKey, baseURL });
    const queryVec = await getEmbedding(client, embeddingModel, query);
    if (!queryVec) return [];
    const scored = vectorIndex.map((item) => ({
      ...item,
      score: cosineSimilarity(queryVec, item.vector),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map((s) => s.room);
  } catch (err) {
    console.error("[RAG] searchSimilarRooms error:", err?.message);
    return [];
  }
}

/** 生成推荐理由的 system prompt */
const REASON_SYSTEM = `你是一个酒店推荐助手。用户已描述出行需求，系统已筛选出符合条件的房型列表。
你的任务：为每个房型写一句**简短推荐理由**（20-50字），说明为什么适合该用户。
要求：
1. 只输出一个 JSON 对象，不要输出其他文字。
2. 格式：{ "reasons": { "房间ID": "推荐理由", ... } }
3. 房间ID 为传入列表中的 _id 字符串。
4. 推荐理由要基于房型、酒店、设施、价格等具体信息，不要泛泛而谈。
5. 若某房间无法写出理由，可写简短概括如"性价比高、位置便利"。`;

/** 调用 LLM 为房间生成推荐理由 */
export async function generateRecommendationReasons(rooms, userQuery, criteria, apiKey, baseURL, chatModel) {
  if (!apiKey || !rooms?.length) return {};
  try {
    const client = new OpenAI({ apiKey, baseURL });
    const roomSummaries = rooms.slice(0, 20).map((r) => {
      const h = r.hotel;
      const price = r.promoDiscount > 0
        ? Math.round(r.pricePerNight * (1 - r.promoDiscount / 100))
        : r.pricePerNight;
      return `ID: ${r._id}\n酒店: ${h?.name || ""} ${h?.city || ""}\n房型: ${roomTypeToCn[r.roomType] || r.roomType}\n价格: ${price}元/晚\n设施: ${(r.amenties || []).join(" ")}`;
    });
    const userContent = `用户需求：${userQuery}\n\n解析条件：${JSON.stringify(criteria)}\n\n房型列表：\n${roomSummaries.join("\n\n")}`;
    const completion = await client.chat.completions.create({
      model: chatModel,
      messages: [
        { role: "system", content: REASON_SYSTEM },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return {};
    const str = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(str);
    } catch (_) {
      return {};
    }
    const reasons = parsed?.reasons || {};
    const result = {};
    for (const [id, reason] of Object.entries(reasons)) {
      if (reason && typeof reason === "string") result[String(id)] = reason.trim();
    }
    return result;
  } catch (err) {
    console.error("[RAG] generateRecommendationReasons error:", err?.message);
    return {};
  }
}
