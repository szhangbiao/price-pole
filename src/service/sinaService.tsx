import { MarketPrice } from '../types/monitor';

export class SinaService {
    private baseUrl = "https://hq.sinajs.cn/list=";

    /**
     * 批量获取新浪股票/指数数据并转换为统一的 MarketPrice 格式
     * @param codes 代码列表
     * @returns 统一格式的数据列表
     */
    async getMarketData(codes: string[]): Promise<MarketPrice[]> {
        if (codes.length === 0) return [];

        try {
            const url = `${this.baseUrl}${codes.join(',')}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Referer': 'https://finance.sina.com.cn',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept-Charset': 'GBK,utf-8;q=0.7,*;q=0.3'
                }
            });

            if (!response.ok) {
                console.error(`Sina API 请求失败: ${response.status}`);
                return [];
            }

            const arrayBuffer = await response.arrayBuffer();
            const decoder = new TextDecoder('gbk');
            const textData = decoder.decode(arrayBuffer);

            return this.parseToMarketPrice(textData, codes);
        } catch (error) {
            console.error('SinaService 获取数据失败:', error);
            return [];
        }
    }

    private parseToMarketPrice(text: string, codes: string[]): MarketPrice[] {
        const results: MarketPrice[] = [];
        const lines = text.split('\n');
        const nowIso = new Date().toISOString();

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const code = codes[i];
            if (!line || !code) continue;

            const match = line.match(/="([^"]+)"/);
            if (!match || !match[1]) continue;

            const dataArray = match[1].split(',');
            if (dataArray.length < 6) continue;

            let price: MarketPrice | null = null;

            // 1. 港股实时行情 (rt_hk...)
            if (code.startsWith('rt_hk')) {
                price = {
                    symbol: code,
                    name: dataArray[1],
                    current: Number(parseFloat(dataArray[6]).toFixed(2)) || 0,
                    change: Number(parseFloat(dataArray[7]).toFixed(2)) || 0,
                    percent: Number(parseFloat(dataArray[8]).toFixed(2)) || 0,
                    open: Number(parseFloat(dataArray[2]).toFixed(2)) || 0,
                    high: Number(parseFloat(dataArray[4]).toFixed(2)) || 0,
                    low: Number(parseFloat(dataArray[5]).toFixed(2)) || 0,
                    lastClose: Number(parseFloat(dataArray[3]).toFixed(2)) || 0,
                    volume: parseInt(dataArray[12]) || 0,
                    amount: parseInt(dataArray[11]) || 0,
                    updateTime: `${dataArray[17]} ${dataArray[18]}`,
                    fetchTime: nowIso,
                    market: 'HK'
                };
            }
            // 2. 美股全量行情 (gb_...)
            else if (code.startsWith('gb_')) {
                price = {
                    symbol: code,
                    name: dataArray[0],
                    current: Number(parseFloat(dataArray[1]).toFixed(2)) || 0,
                    change: Number(parseFloat(dataArray[4]).toFixed(2)) || 0,
                    percent: Number(parseFloat(dataArray[2]).toFixed(2)) || 0,
                    open: Number(parseFloat(dataArray[5]).toFixed(2)) || 0,
                    high: Number(parseFloat(dataArray[6]).toFixed(2)) || 0,
                    low: Number(parseFloat(dataArray[7]).toFixed(2)) || 0,
                    lastClose: Number(parseFloat(dataArray[26]).toFixed(2)) || 0,
                    volume: parseInt(dataArray[10]) || 0,
                    amount: 0,
                    updateTime: dataArray[3],
                    fetchTime: nowIso,
                    market: 'US',
                    extra: {
                        high52w: Number(parseFloat(dataArray[8]).toFixed(2)),
                        low52w: Number(parseFloat(dataArray[9]).toFixed(2))
                    }
                };
            }
            // 3. 黄金/期货行情 (hf_...)
            else if (code.startsWith('hf_')) {
                // 新浪国际期货 (hf_XAU, hf_GC, etc.)
                // 0: 最新价, 1: 昨收/结算参考, 2: 买入, 3: 卖出, 4: 最高, 5: 最低, 6: 时间, 7: 昨结算, 8: 开盘, 12: 日期, 13: 名称
                const current = Number(parseFloat(dataArray[0]).toFixed(2)) || 0;
                const lastClose = Number(parseFloat(dataArray[7]).toFixed(2)) || 0;
                const change = Number((current - lastClose).toFixed(2));
                const percent = lastClose > 0 ? Number(((change / lastClose) * 100).toFixed(2)) : 0;

                price = {
                    symbol: code,
                    name: dataArray[13] || (code === 'hf_XAU' ? '伦敦金' : code),
                    current: current,
                    change: change,
                    percent: percent,
                    open: Number(parseFloat(dataArray[8]).toFixed(2)) || 0,
                    high: Number(parseFloat(dataArray[4]).toFixed(2)) || 0,
                    low: Number(parseFloat(dataArray[5]).toFixed(2)) || 0,
                    lastClose: lastClose,
                    volume: 0,
                    amount: 0,
                    updateTime: `${dataArray[12]} ${dataArray[6]}`,
                    fetchTime: nowIso,
                    market: 'COMMODITY'
                };
            }
            // 4. 国内 A股/指数 完整版 (sh..., sz...)
            else if (code.startsWith('sh') || code.startsWith('sz')) {
                const current = Number(parseFloat(dataArray[3]).toFixed(2)) || 0;
                const lastClose = Number(parseFloat(dataArray[2]).toFixed(2)) || 0;
                const change = Number((current - lastClose).toFixed(2));
                const percent = lastClose > 0 ? Number(((change / lastClose) * 100).toFixed(2)) : 0;

                price = {
                    symbol: code,
                    name: dataArray[0],
                    current: current,
                    change: change,
                    percent: percent,
                    open: Number(parseFloat(dataArray[1]).toFixed(2)) || 0,
                    high: Number(parseFloat(dataArray[4]).toFixed(2)) || 0,
                    low: Number(parseFloat(dataArray[5]).toFixed(2)) || 0,
                    lastClose: lastClose,
                    volume: parseInt(dataArray[8]) || 0,
                    amount: parseInt(dataArray[9]) || 0,
                    updateTime: `${dataArray[30]} ${dataArray[31]}`,
                    fetchTime: nowIso,
                    market: 'CN'
                };
            }
            // 5. 国内 A股/指数 简版 (s_sh, s_sz)
            else if (code.startsWith('s_')) {
                price = {
                    symbol: code,
                    name: dataArray[0],
                    current: Number(parseFloat(dataArray[1]).toFixed(2)) || 0,
                    change: Number(parseFloat(dataArray[2]).toFixed(2)) || 0,
                    percent: Number(parseFloat(dataArray[3]).toFixed(2)) || 0,
                    open: 0,
                    high: 0,
                    low: 0,
                    lastClose: 0,
                    volume: parseInt(dataArray[4]) || 0,
                    amount: parseInt(dataArray[5]) || 0,
                    updateTime: nowIso, // 简版不带时间
                    fetchTime: nowIso,
                    market: 'CN'
                };
            }
            // 6. 全球指数行情 (znb_...)
            else if (code.startsWith('znb_')) {
                price = {
                    symbol: code,
                    name: dataArray[0],
                    current: Number(parseFloat(dataArray[1]).toFixed(2)) || 0,
                    change: Number(parseFloat(dataArray[2]).toFixed(2)) || 0,
                    percent: Number(parseFloat(dataArray[3]).toFixed(2)) || 0,
                    open: Number(parseFloat(dataArray[8]).toFixed(2)) || 0,
                    high: Number(parseFloat(dataArray[10]).toFixed(2)) || 0,
                    low: Number(parseFloat(dataArray[11]).toFixed(2)) || 0,
                    lastClose: Number(parseFloat(dataArray[9]).toFixed(2)) || 0,
                    volume: parseInt(dataArray[12]) || 0,
                    amount: 0,
                    updateTime: `${dataArray[6]} ${dataArray[7]}`,
                    fetchTime: nowIso,
                    market: 'GLOBAL'
                };
            }

            if (price) results.push(price);
        }
        return results;
    }
}
