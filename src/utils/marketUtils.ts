
/**
 * 市场类型
 */
export type MarketType = 'CN' | 'HK' | 'US' | 'GOLD' | 'GLOBAL' | 'COMMODITY';

/**
 * 判断指定市场在当前时间是否处于交易时段（北京时间）
 * @param market 市场类型
 * @param date 可选的日期对象，默认为当前时间
 * @returns boolean
 */
export function isMarketOpen(market: MarketType, date: Date = new Date()): boolean {
    // 转换为北京时间 (UTC+8)
    // Cloudflare Workers 环境下 Date 对象通常是 UTC
    const bjTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);

    const day = bjTime.getUTCDay(); // 0 是周日, 6 是周六
    const hour = bjTime.getUTCHours();
    const minute = bjTime.getUTCMinutes();
    const timeValue = hour * 100 + minute; // 方便比较，例如 09:30 -> 930

    // 周六周日休市（黄金/原油等国际商品除外，通常 24/5，周六凌晨收盘，周一早晨开盘）
    if (day === 0 || day === 6) {
        if (market === 'GOLD' || market === 'COMMODITY') {
            // 商品通常在周六凌晨 5-6 点收盘，周一早上 6-7 点开盘
            if (day === 6 && timeValue < 600) return true; // 周六凌晨
            return false;
        }
        return false;
    }

    switch (market) {
        case 'CN':
            // A股：9:15-11:30, 13:00-15:30 (包含盘前集合竞价和盘后作业)
            return (timeValue >= 915 && timeValue <= 1135) || (timeValue >= 1255 && timeValue <= 1530);

        case 'HK':
            // 港股：9:15-12:10, 13:00-16:15
            return (timeValue >= 915 && timeValue <= 1210) || (timeValue >= 1255 && timeValue <= 1615);

        case 'US':
            // 美股：21:15-05:00 (粗略包含夏令时和冬令时)
            return (timeValue >= 2115 || timeValue <= 505);

        case 'GOLD':
        case 'COMMODITY':
            // 国际商品：基本全天，除了凌晨 5:00-7:00 之间的结算时间
            return !(timeValue >= 500 && timeValue <= 700);

        case 'GLOBAL':
            // 全球指数（主要针对日韩）：08:00 - 15:00 (北京时间)
            return (timeValue >= 800 && timeValue <= 1500);

        default:
            return false;
    }
}
