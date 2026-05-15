
export interface MonitorRule {
    id: string;
    symbol: string;
    name: string;
    type: 'above' | 'below' | 'percent_up' | 'percent_down';
    threshold: number;
    enabled: boolean;
    userId?: string;
    lastNotifiedAt?: number; // 时间戳
}

export interface MarketPrice {
    symbol: string;      // 原始代码
    name: string;        // 名称
    current: number;     // 当前价/点位
    change: number;      // 涨跌额
    percent: number;     // 涨跌幅 (%)
    open: number;        // 开盘价
    high: number;        // 最高价
    low: number;         // 最低价
    lastClose: number;   // 昨收价
    volume: number;      // 成交量
    amount: number;      // 成交额
    updateTime: string;  // 市场更新时间
    fetchTime: string;   // 系统抓取时间
    market: 'CN' | 'HK' | 'US' | 'GOLD' | 'GLOBAL';
    
    // 扩展字段，用于存储不同市场的特有数据
    extra?: {
        high52w?: number;  // 52周最高
        low52w?: number;   // 52周最低
        delay?: boolean;   // 是否有延迟
    }
}

export interface MonitorStorage {
    timestamp: number;
    results: MarketPrice[];
}
