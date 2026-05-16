/**
 * 获取当前的北京时间 Date 对象
 */
export function getBeijingDate(): Date {
    const now = new Date();
    // 强制转换为 UTC+8
    return new Date(now.getTime() + (8 * 60 * 60 * 1000));
}

/**
 * 判断当前是否处于开盘时间 (基于北京时间)
 * @param marketType 市场类型: CN, HK, US, GOLD, COMMODITY
 */
export function isMarketOpen(marketType: string): boolean {
    // 使用专门的北京时间转换函数
    const now = new Date();
    // Cloudflare Workers 运行环境通常是 UTC
    // 我们通过 Intl 转换或偏移计算来获取北京时间数据
    const beijingTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai', hour12: false });
    const bjDate = new Date(beijingTimeStr);
    
    const day = bjDate.getDay(); // 0 是周日, 6 是周六
    const hour = bjDate.getHours();
    const min = bjDate.getMinutes();
    const currentTime = hour * 100 + min;

    // 1. 周末判断 (周六周日)
    if (day === 0 || day === 6) {
        // 大宗商品/黄金在周六早晨可能还开着 (收盘前)
        if (marketType === 'GOLD' || marketType === 'COMMODITY') {
            if (day === 6 && currentTime < 600) return true;
        }
        return false;
    }

    // 2. 分市场判断
    switch (marketType) {
        case 'CN': // A股：9:30-11:30, 13:00-15:00
            return (currentTime >= 930 && currentTime <= 1130) || 
                   (currentTime >= 1300 && currentTime <= 1500);
        
        case 'HK': // 港股：9:30-12:00, 13:00-16:00
            return (currentTime >= 930 && currentTime <= 1200) || 
                   (currentTime >= 1300 && currentTime <= 1600);
        
        case 'US': // 美股 (北京时间)：21:30-04:00 (次日)
            return (currentTime >= 2130 || currentTime <= 400);
        
        case 'GOLD':
        case 'COMMODITY': // 国际期货：通常周一 06:00 到周六 06:00 连续
            if (day === 1 && currentTime < 600) return false; // 周一早上6点开盘
            return true;
        
        default:
            return true;
    }
}

/**
 * 判断是否所有市场都已休市 (用于优化 Cron)
 */
export function isAnyMarketOpen(): boolean {
    const markets = ['CN', 'HK', 'US', 'GOLD'];
    return markets.some(m => isMarketOpen(m));
}
