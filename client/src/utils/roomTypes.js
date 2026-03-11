/**
 * 房型常量：新增/编辑房间可选，以及各页面展示映射
 * 支持多样化房型：雅致大床房、高端大床房、舒适大床房等
 */

/** 房型选项：{ value, label }，用于下拉选择 */
export const ROOM_TYPE_OPTIONS = [
  { value: "Single Bed", label: "单人间" },
  { value: "Double Bed", label: "双人间" },
  { value: "King Bed", label: "大床房" },
  { value: "Elegant King Bed", label: "雅致大床房" },
  { value: "Premium King Bed", label: "高端大床房" },
  { value: "Comfortable King Bed", label: "舒适大床房" },
  { value: "Deluxe King Bed", label: "豪华大床房" },
  { value: "Cozy King Bed", label: "温馨大床房" },
  { value: "View King Bed", label: "观景大床房" },
  { value: "Business King Bed", label: "商务大床房" },
  { value: "Business Room", label: "商务房" },
  { value: "Standard Room", label: "标准间" },
  { value: "Sea View Room", label: "海景房" },
  { value: "Suite", label: "套房" },
  { value: "Luxury Room", label: "豪华房" },
  { value: "Family Suite", label: "家庭套房" },
];

/** 英文 -> 中文 映射，用于展示 */
export const roomTypeToCn = Object.fromEntries(
  ROOM_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

/** 根据房型 key 获取展示名称 */
export function getRoomTypeLabel(roomType) {
  return roomTypeToCn[roomType] || roomType;
}
