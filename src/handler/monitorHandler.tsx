import { Context } from 'hono';
import { SinaService } from '../service/sinaService';
import { isMarketOpen } from '../utils/marketUtils';
import { MarketPrice } from '../types/monitor';
import { H_SHARE_INDEX, US_STOCK_INDEX, GOLD_INDEX } from '../config/markets';

const KEY_MONITOR_STATE = 'monitor_state';

export class MonitorHandler {
	private sinaService: SinaService;
	private env: Env;

	constructor(env: Env) {
		this.sinaService = new SinaService();
		this.env = env;
	}

	/**
	 * 执行监控逻辑：监控大盘指数及重点标的是否达到今日最高或最低
	 */
	async runMonitor(): Promise<void> {
		// 1. 汇总监控标的 (从 markets 配置中获取)
		const allIndices = [
			//...H_SHARE_INDEX,
			//...US_STOCK_INDEX,
			...GOLD_INDEX
		];
		const symbols = Array.from(new Set(allIndices.map(idx => idx.code)));

		// 2. 获取实时行情
		const prices = await this.sinaService.getMarketData(symbols);

		// 3. 获取持久化状态
		const states = await this.getStates();
		const today = new Date().toISOString().split('T')[0];

		for (const price of prices) {
			if (!isMarketOpen(price.market)) continue;
			if (price.market === 'GOLD') {
				// --- 黄金监控逻辑：实时极值突破 ---
				const highKey = `gold_high_${price.symbol}_${today}`;
				const lowKey = `gold_low_${price.symbol}_${today}`;
				const lastHigh = states[highKey] || 0;
				const lastLow = states[lowKey] || 0;
				// 检查新高 (只要有突破就立即触发，无冷却限制)
				if (price.high > 0 && price.high > lastHigh) {
					if (lastHigh > 0) {
						console.log(`[黄金新高告警] ${price.name} 突破今日前高: ${price.high} (前高: ${lastHigh})`);
						// TODO: 接入通知服务
					}
					states[highKey] = price.high;
				}
				// 检查新低
				if (price.low > 0 && (lastLow === 0 || price.low < lastLow)) {
					if (lastLow > 0) {
						console.log(`[黄金新低告警] ${price.name} 跌破今日前低: ${price.low} (前低: ${lastLow})`);
						// TODO: 接入通知服务
					}
					states[lowKey] = price.low;
				}
			} else {
				// --- 指数监控逻辑：整数百分比突破 ---
				const levelKey = `idx_level_${price.symbol}_${today}`;
				const lastLevel = states[levelKey] || 0;
				// 计算当前涨跌幅的整数部分 (如 1.2% -> 1, -1.5% -> -1)
				const currentPercent = price.percent;
				const currentLevel = currentPercent > 0 ? Math.floor(currentPercent) : Math.ceil(currentPercent);
				// 当绝对值大于等于 1% 且 整数位发生变化时触发
				if (Math.abs(currentLevel) >= 1 && currentLevel !== lastLevel) {
					console.log(`[指数波动告警] ${price.name} 涨跌幅跨越整数位: ${currentLevel}% (当前: ${currentPercent}%)`);
					// TODO: 接入通知服务
					states[levelKey] = currentLevel;
				}
			}
		}
		// 4. 保存最新状态
		await this.saveStates(states);
	}

	/**
	 * 批量获取标的的结构化行情数据
	 */
	async getSymbolsData(symbols: string[]): Promise<MarketPrice[]> {
		return await this.sinaService.getMarketData(symbols);
	}

	private async getStates(): Promise<Record<string, number>> {
		const data = await this.env.PRICE_DATA.get(KEY_MONITOR_STATE);
		return data ? JSON.parse(data) : {};
	}

	private async saveStates(states: Record<string, number>): Promise<void> {
		await this.env.PRICE_DATA.put(KEY_MONITOR_STATE, JSON.stringify(states));
	}
}

/**
 * 接口处理器：获取实时行情 (支持逗号分隔多个代码)
 */
export async function getMarketData(c: Context<{ Bindings: Env }>) {
	const symbolStr = c.req.query('symbol');
	if (!symbolStr) {
		return c.json({ success: false, message: '缺少 symbol 参数' }, 400);
	}

	const symbols = symbolStr.split(',').filter(s => s.trim().length > 0);
	if (symbols.length === 0) {
		return c.json({ success: false, message: '无效的 symbol 参数' }, 400);
	}

	const handler = new MonitorHandler(c.env);
	const data = await handler.getSymbolsData(symbols);

	return c.json({
		success: true,
		count: data.length,
		data: symbols.length === 1 ? data[0] : data
	});
}
