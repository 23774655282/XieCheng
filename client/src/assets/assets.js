import logo from './logo.svg'
import searchIcon from './searchIcon.svg'
import userIcon from './userIcon.svg'
import calenderIcon from './calenderIcon.svg'
import locationIcon from './locationIcon.svg'
import starIconFilled from './starIconFilled.svg'
import arrowIcon from './arrowIcon.svg'
import starIconOutlined from './starIconOutlined.svg'
import freeWifiIcon from './freeWifiIcon.svg'
import freeBreakfastIcon from './freeBreakfastIcon.svg'
import roomServiceIcon from './roomServiceIcon.svg'
import mountainIcon from './mountainIcon.svg'
import poolIcon from './poolIcon.svg'
import homeIcon from './homeIcon.svg'
import closeIcon from './closeIcon.svg'
import locationFilledIcon from './locationFilledIcon.svg'
import heartIcon from './heartIcon.svg'
import badgeIcon from './badgeIcon.svg'
import menuIcon from './menuIcon.svg'
import closeMenu from './closeMenu.svg'
import guestsIcon from './guestsIcon.svg'
import regImage from './regImage.png'
import heroImage from './heroImage.png'
// 首页 Hero 轮播图：建议使用高清图，规格见下方 heroCarouselImages 注释
import home1 from './home1.jpg'
import home2 from './home2.jpg'
import home3 from './home3.jpg'
import home4 from './home4.jpg'
import home5 from './home5.jpg'
import exclusiveOfferCardImg1 from "./exclusiveOfferCardImg1.png";
import exclusiveOfferCardImg2 from "./exclusiveOfferCardImg2.png";
import exclusiveOfferCardImg3 from "./exclusiveOfferCardImg3.png";
import addIcon from "./addIcon.svg";
import dashboardIcon from "./dashboardIcon.svg";
import listIcon from "./listIcon.svg";
import uploadArea from "./uploadArea.svg";
import totalBookingIcon from "./totalBookingIcon.svg";
import totalRevenueIcon from "./totalRevenueIcon.svg";


export const assets = {
    logo,
    searchIcon,
    userIcon,
    calenderIcon,
    locationIcon,
    starIconFilled,
    arrowIcon,
    starIconOutlined,
    freeWifiIcon,
    freeBreakfastIcon,
    roomServiceIcon,
    mountainIcon,
    poolIcon,
    closeIcon,
    homeIcon,
    locationFilledIcon,
    heartIcon,
    badgeIcon,
    menuIcon,
    closeMenu,
    guestsIcon,
    regImage,
    addIcon,
    dashboardIcon,
    listIcon,
    uploadArea,
    totalBookingIcon,
    totalRevenueIcon,
}

/**
 * 首页 Hero 轮播背景图：将更多图片放入 assets 并在此数组中引入即可。
 *
 * 【高清图选图建议】
 * - 分辨率：至少 1920×1080（Full HD）；有 Retina 屏或大屏需求建议 2560×1440 或 3840×2160。
 * - 比例：16:9 最适配全屏横屏展示，避免拉伸变形。
 * - 格式：JPG 质量 85–90% 或 WebP（体积更小）。
 * - 单张体积：建议 200KB–600KB，兼顾清晰度与首屏加载。
 * - 内容：酒店/旅行场景、光线充足、主体清晰，避免过暗或文字过多。
 */
export const heroCarouselImages = [home1, home2, home3, home4, home5];

export const cities = [
    "Dubai",
    "Singapore",
    "New York",
    "London",
];

/** 国内热门城市（与参考图一致） */
export const domesticHotCities = [
  "北京", "上海", "天津", "重庆", "大连", "青岛", "西安", "南京", "苏州", "杭州",
  "厦门", "成都", "深圳", "广州", "三亚", "台北", "香港", "济南", "宁波", "沈阳",
  "武汉", "郑州",
];

/** 海外热门城市（与参考图一致） */
export const overseasHotCities = [
  "首尔", "曼谷", "普吉岛", "东京", "新加坡", "大阪", "济州市", "巴厘岛", "清迈", "哥打京那巴鲁",
  "京都", "吉隆坡", "芭堤雅", "那霸", "洛杉矶", "苏梅岛", "巴黎", "甲米", "拉斯维加斯", "伦敦",
  "纽约", "芽庄", "悉尼",
];

/** 各城市当地热门地点推荐（用于目的地下拉） icon: location | building | airplane */
export const popularPlacesByCity = {
  东京: [
    { name: "东京", subtitle: "东京都, 日本", icon: "location" },
    { name: "东京市中心", subtitle: "东京, 东京都, 日本", icon: "location" },
    { name: "东京站", subtitle: "东京, 东京都, 日本", icon: "building" },
    { name: "东京羽田机场", subtitle: "东京, 东京都, 日本", icon: "airplane" },
    { name: "东京迪士尼乐园", subtitle: "东京, 东京都, 日本", icon: "building" },
  ],
  大阪: [
    { name: "大阪", subtitle: "大阪府, 日本", icon: "location" },
    { name: "大阪市中心", subtitle: "大阪, 大阪府, 日本", icon: "location" },
    { name: "大阪站", subtitle: "大阪, 大阪府, 日本", icon: "building" },
    { name: "关西国际机场", subtitle: "大阪, 日本", icon: "airplane" },
    { name: "难波", subtitle: "大阪, 大阪府, 日本", icon: "building" },
  ],
  京都: [
    { name: "京都", subtitle: "京都府, 日本", icon: "location" },
    { name: "京都市中心", subtitle: "京都, 京都府, 日本", icon: "location" },
    { name: "京都站", subtitle: "京都, 京都府, 日本", icon: "building" },
    { name: "祇园", subtitle: "京都, 京都府, 日本", icon: "building" },
  ],
  首尔: [
    { name: "首尔", subtitle: "首尔特别市, 韩国", icon: "location" },
    { name: "首尔市中心", subtitle: "首尔, 韩国", icon: "location" },
    { name: "明洞", subtitle: "首尔, 韩国", icon: "building" },
    { name: "仁川国际机场", subtitle: "首尔, 韩国", icon: "airplane" },
    { name: "江南区", subtitle: "首尔, 韩国", icon: "building" },
  ],
  曼谷: [
    { name: "曼谷", subtitle: "曼谷都会区, 泰国", icon: "location" },
    { name: "曼谷市中心", subtitle: "曼谷, 泰国", icon: "location" },
    { name: "素万那普机场", subtitle: "曼谷, 泰国", icon: "airplane" },
    { name: "暹罗", subtitle: "曼谷, 泰国", icon: "building" },
  ],
  北京: [
    { name: "北京", subtitle: "北京市, 中国", icon: "location" },
    { name: "北京市中心", subtitle: "北京, 中国", icon: "location" },
    { name: "北京首都国际机场", subtitle: "北京, 中国", icon: "airplane" },
    { name: "北京南站", subtitle: "北京, 中国", icon: "building" },
    { name: "故宫", subtitle: "北京, 中国", icon: "building" },
  ],
  上海: [
    { name: "上海", subtitle: "上海市, 中国", icon: "location" },
    { name: "上海市中心", subtitle: "上海, 中国", icon: "location" },
    { name: "上海浦东国际机场", subtitle: "上海, 中国", icon: "airplane" },
    { name: "上海虹桥机场", subtitle: "上海, 中国", icon: "airplane" },
    { name: "外滩", subtitle: "上海, 中国", icon: "building" },
  ],
  广州: [
    { name: "广州", subtitle: "广东省, 中国", icon: "location" },
    { name: "广州市中心", subtitle: "广州, 中国", icon: "location" },
    { name: "广州白云国际机场", subtitle: "广州, 中国", icon: "airplane" },
    { name: "广州南站", subtitle: "广州, 中国", icon: "building" },
  ],
  深圳: [
    { name: "深圳", subtitle: "广东省, 中国", icon: "location" },
    { name: "深圳市中心", subtitle: "深圳, 中国", icon: "location" },
    { name: "深圳宝安国际机场", subtitle: "深圳, 中国", icon: "airplane" },
    { name: "福田", subtitle: "深圳, 中国", icon: "building" },
  ],
  杭州: [
    { name: "杭州", subtitle: "浙江省, 中国", icon: "location" },
    { name: "杭州市中心", subtitle: "杭州, 中国", icon: "location" },
    { name: "杭州萧山国际机场", subtitle: "杭州, 中国", icon: "airplane" },
    { name: "西湖", subtitle: "杭州, 中国", icon: "building" },
  ],
  成都: [
    { name: "成都", subtitle: "四川省, 中国", icon: "location" },
    { name: "成都市中心", subtitle: "成都, 中国", icon: "location" },
    { name: "成都双流国际机场", subtitle: "成都, 中国", icon: "airplane" },
    { name: "春熙路", subtitle: "成都, 中国", icon: "building" },
  ],
  香港: [
    { name: "香港", subtitle: "香港特别行政区", icon: "location" },
    { name: "香港市中心", subtitle: "香港", icon: "location" },
    { name: "香港国际机场", subtitle: "香港", icon: "airplane" },
    { name: "尖沙咀", subtitle: "香港", icon: "building" },
  ],
  三亚: [
    { name: "三亚", subtitle: "海南省, 中国", icon: "location" },
    { name: "三亚湾", subtitle: "三亚, 中国", icon: "location" },
    { name: "亚龙湾", subtitle: "三亚, 中国", icon: "building" },
    { name: "凤凰国际机场", subtitle: "三亚, 中国", icon: "airplane" },
  ],
  新加坡: [
    { name: "新加坡", subtitle: "新加坡", icon: "location" },
    { name: "新加坡市中心", subtitle: "新加坡", icon: "location" },
    { name: "樟宜机场", subtitle: "新加坡", icon: "airplane" },
    { name: "滨海湾", subtitle: "新加坡", icon: "building" },
  ],
  纽约: [
    { name: "纽约", subtitle: "纽约州, 美国", icon: "location" },
    { name: "曼哈顿", subtitle: "纽约, 美国", icon: "building" },
    { name: "肯尼迪国际机场", subtitle: "纽约, 美国", icon: "airplane" },
    { name: "时代广场", subtitle: "纽约, 美国", icon: "building" },
  ],
  巴黎: [
    { name: "巴黎", subtitle: "法兰西岛, 法国", icon: "location" },
    { name: "巴黎市中心", subtitle: "巴黎, 法国", icon: "location" },
    { name: "戴高乐机场", subtitle: "巴黎, 法国", icon: "airplane" },
    { name: "埃菲尔铁塔", subtitle: "巴黎, 法国", icon: "building" },
  ],
  伦敦: [
    { name: "伦敦", subtitle: "英格兰, 英国", icon: "location" },
    { name: "伦敦市中心", subtitle: "伦敦, 英国", icon: "location" },
    { name: "希思罗机场", subtitle: "伦敦, 英国", icon: "airplane" },
    { name: "国王十字站", subtitle: "伦敦, 英国", icon: "building" },
  ],
};

/** 为未预设城市生成默认热门地点（国内城市用“中国”，海外用城市名） */
export function getPopularPlacesForCity(cityName, isDomestic = false) {
  if (!cityName || !String(cityName).trim()) return [];
  const city = String(cityName).trim();
  if (popularPlacesByCity[city]) return popularPlacesByCity[city];
  const subtitle = isDomestic ? `${city}, 中国` : city;
  return [
    { name: city, subtitle, icon: "location" },
    { name: `${city}市中心`, subtitle, icon: "location" },
    { name: `${city}站`, subtitle, icon: "building" },
    { name: `${city}机场`, subtitle, icon: "airplane" },
  ];
}

// Exclusive Offers Dummy Data
export const exclusiveOffers = [
    { _id: 1, title: "夏日畅享套餐", description: "享免费住宿一晚及每日早餐", priceOff: 25, expiryDate: "8月31日", image: exclusiveOfferCardImg1 },
    { _id: 2, title: "浪漫双人套餐", description: "专享双人套餐含 Spa 护理", priceOff: 20, expiryDate: "9月20日", image: exclusiveOfferCardImg2 },
    { _id: 3, title: "奢华度假", description: "提前 60 天预订，享全球奢华酒店优惠。", priceOff: 30, expiryDate: "9月25日", image: exclusiveOfferCardImg3 },
    { _id: 4, title: "家庭亲子畅游", description: "两大一小专属优惠，含儿童乐园及亲子活动", priceOff: 35, expiryDate: "10月15日", image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800" },
]

// Testimonials Dummy Data
export const testimonials = [
    { id: 1, name: "Emma Rodriguez", address: "Barcelona, Spain", image: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200", rating: 5, review: "我用过不少预订平台，易宿酒店预订平台的个性化体验和细节服务最让我满意。" },
    { id: 2, name: "Liam Johnson", address: "New York, USA", image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200", rating: 4, review: "易宿酒店预订平台超出预期，预订流程顺畅，酒店品质一流，强烈推荐！" },
    { id: 3, name: "Sophia Lee", address: "Seoul, South Korea", image: "https://images.unsplash.com/photo-1701615004837-40d8573b6652?q=80&w=200", rating: 5, review: "服务很棒！通过易宿酒店预订平台总能找到心仪的住宿，推荐从没让我失望。" }
];

// Facility Icon
export const facilityIcons = {
    "Free Wifi": assets.freeWifiIcon,
    "Free Breakfast": assets.freeBreakfastIcon,
    "Room Service": assets.roomServiceIcon,
    "Mountain View": assets.mountainIcon,
    "Pool Access": assets.poolIcon,
};

// For Room Details Page
export const roomCommonData = [
    { icon: assets.homeIcon, title: "整洁安全", description: "维护良好、卫生舒适的空间。" },
    { icon: assets.badgeIcon, title: "深度清洁", description: "严格遵循清洁标准。" },
    { icon: assets.locationFilledIcon, title: "优越位置", description: "90% 的客人对位置给出 5 星评价。" },
    { icon: assets.heartIcon, title: "便捷入住", description: "100% 的客人对入住体验给出 5 星评价。" },
];
