// API响应接口
export interface ApiResponse<T> {
  error_code: number;
  reason: string;
  result: T;
}

// 数据实体接口
export interface GoldData {
  variety: string;
  latestpri: string;
  openpri: string;
  maxpri: string;
  minpri: string;
  limit: string;
  yespri: string;
  totalvol: string;
  time: string;
}

// 黄金品种数据接口（对应你提供的数据结构）
export interface GoldVarietyData {
  variety: string;
  latestpri: string;
  openpri: string;
  maxpri: string;
  minpri: string;
  limit: string;
  yespri: string;
  totalvol: string;
  time: string;
}

// 或者使用 Record 类型的方式
export type MetalVarietiesMap = Record<string, GoldData>;


export interface ExchangeRateData {
  currencyF: string;
  currencyF_Name: string;
  currencyT: string;
  currencyT_Name: string;
  currencyFD: string;
  exchange: string;
  result: string;
  updateTime: string;
}

export interface StockData {
  name: string;
  current: number;
  change: number;
  percent: number;
  volume: number;
  amount: number;
}

export interface PriceData {
  type: number;
  gold?: GoldData;
  exchangeRate?: ExchangeRateData;
  stocks?: StockData[];
  source?: string;
  updateTime: string;
}

// 通用价格数据接口（用于存储服务）
export interface PriceStorage {
  timestamp: number;
  data: any;
  source: string;
}

export interface PriceAlert {
  name: string;
  price: string;
  detail: string;
  remark: string;
}

