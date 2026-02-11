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
import home1 from './home1.jpg'
import home2 from './home2.jpg'
import home3 from './home3.jpg'
import home4 from './home4.jpg'
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

/** 首页 Hero 轮播背景图：将更多图片放入 assets 并在此数组中引入即可 */
export const heroCarouselImages = [home1, home2, home3, home4];

export const cities = [
    "Dubai",
    "Singapore",
    "New York",
    "London",
];

// Exclusive Offers Dummy Data
export const exclusiveOffers = [
    { _id: 1, title: "夏日畅享套餐", description: "享免费住宿一晚及每日早餐", priceOff: 25, expiryDate: "8月31日", image: exclusiveOfferCardImg1 },
    { _id: 2, title: "浪漫双人套餐", description: "专享双人套餐含 Spa 护理", priceOff: 20, expiryDate: "9月20日", image: exclusiveOfferCardImg2 },
    { _id: 3, title: "奢华度假", description: "提前 60 天预订，享全球奢华酒店优惠。", priceOff: 30, expiryDate: "9月25日", image: exclusiveOfferCardImg3 },
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
