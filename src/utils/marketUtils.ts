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
 * @param marketType 市场类型
 */
export function isMarketOpen(marketType: string): boolean {
    const now = new Date();
    const beijingTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai', hour12: false });
    const bjDate = new Date(beijingTimeStr);

    const day = bjDate.getDay(); // 0 是周日, 6 是周六
    const hour = bjDate.getHours();
    const min = bjDate.getMinutes();
    const currentTime = hour * 100 + min;

    // 1. 周末判断
    if (day === 0 || day === 6) {
        // 国际期货品种（贵金属、能源）在周六早晨 06:00 前通常还在交易
        if (marketType === 'METAL' || marketType === 'ENERGY') {
            if (day === 6 && currentTime < 600) return true;
        }
        return false;
    }

    // 2. 分市场判断
    switch (marketType) {
        case 'CN': // A股
            return (currentTime >= 930 && currentTime <= 1130) ||
                (currentTime >= 1300 && currentTime <= 1500);
        case 'HK': // 港股
            return (currentTime >= 930 && currentTime <= 1200) ||
                (currentTime >= 1300 && currentTime <= 1600);
        case 'US': // 美股
            return (currentTime >= 2130 || currentTime <= 400);
        case 'METAL':
        case 'ENERGY':
            // 国际期货：周一早上 06:00 开盘
            if (day === 1 && currentTime < 600) return false;
            return true;
        case 'GLOBAL': // 日韩市场 (比 A股 早 1 小时)
            return (currentTime >= 800 && currentTime <= 1430);
        default:
            return true;
    }
}

/**
 * 判断当前是否至少有一个市场处于开盘时段 (用于优化定时任务)
 * 只有在至少一个市场开盘时才执行监控逻辑，节省资源
 */
export function isAnyMarketOpen(): boolean {
    const markets = ['CN', 'HK', 'US', 'METAL', 'ENERGY', 'GLOBAL'];
    return markets.some(market => isMarketOpen(market));
}
