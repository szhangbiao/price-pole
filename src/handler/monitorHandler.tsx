import { Context } from 'hono';
import { SinaService } from '../service/sinaService';
import { isMarketOpen, getBeijingDate } from '../utils/marketUtils';
import { MarketPrice } from '../types/monitor';
import { A_SHARE_INDEX, H_SHARE_INDEX, US_STOCK_INDEX, METAL_INDEX, ENERGY_INDEX, GLOBAL_INDEX, BOND_INDEX } from '../config/markets';
import { WechatSendService } from '../service/wechatSend';
import { PriceAlert } from '../types/price';
import { UpstashService } from '../service/upstashService';

const KEY_MONITOR_STATE = 'monitor_state';
const KEY_LATEST_PRICES = 'latest_prices';

/**
 * 极值监控处理器
 */
export class MonitorHandler {
	private sinaService: SinaService;
	private wechatService: WechatSendService;
	private upstashService: UpstashService;
	private env: Env;

	constructor(env: Env) {
		this.sinaService = new SinaService();
		this.wechatService = new WechatSendService();
		this.upstashService = new UpstashService(env, 7 * 24 * 3600); // 设置 7 天过期时间
		this.env = env;
	}

	/**
	 * 执行监控逻辑：监控大盘指数及重点标的是否达到今日最高或最低
	 */
	async runMonitor(): Promise<void> {
		// 1. 汇总监控标的 (从 markets 配置中获取)
		const allIndices = [
			...A_SHARE_INDEX,
			...H_SHARE_INDEX,
			...US_STOCK_INDEX,
			...METAL_INDEX,
			...ENERGY_INDEX,
			...GLOBAL_INDEX,
			...BOND_INDEX
		];

		const symbols = Array.from(new Set(allIndices.map(idx => idx.code)));

		// 2. 获取实时行情
		const prices = await this.sinaService.getMarketData(symbols);

		// 3. 更新并持久化所有市场的最新价格快照 (防止休市市场数据被覆盖)
		await this.updateLatestPrices(prices);

		// 4. 获取极值监控所需的持久化状态
		const states = await this.getStates();
		const bjDate = getBeijingDate();
		const today = bjDate.toISOString().split('T')[0];

		for (const price of prices) {
			if (!isMarketOpen(price.market)) continue;

			if (price.market === 'METAL') {
				// --- 商品监控逻辑：实时极值突破 ---
				const stateKey = price.market.toLowerCase();
				const highKey = `${stateKey}_high_${price.symbol}_${today}`;
				const lowKey = `${stateKey}_low_${price.symbol}_${today}`;
				const lastHigh = states[highKey] || 0;
				const lastLow = states[lowKey] || 0;

				const isGold = price.name.includes('黄金') || price.name.includes('金');
				const isSilver = price.name.includes('白银') || price.name.includes('银');
				const assetName = isGold ? '黄金' : (isSilver ? '白银' : '商品');

				// 检查新高 (只要有突破就立即触发，无冷却限制)
				if (price.high > 0 && price.high > lastHigh) {
					if (lastHigh > 0) {
						await this.sendAlertToWechat({
							name: price.name,
							price: `${price.current} (${price.percent}%)`,
							detail: `突破今日前高: ${price.high} (前高: ${lastHigh})`,
							remark: `${assetName}价格突破今日极值，请留意行情变动。`
						}, price.symbol);
					}
					states[highKey] = price.high;
				}
				// 检查新低
				if (price.low > 0 && (lastLow === 0 || price.low < lastLow)) {
					if (lastLow > 0) {
						await this.sendAlertToWechat({
							name: price.name,
							price: `${price.current} (${price.percent}%)`,
							detail: `跌破今日前低: ${price.low} (前低: ${lastLow})`,
							remark: `${assetName}价格跌破今日极值，请留意行情变动。`
						}, price.symbol);
					}
					states[lowKey] = price.low;
				}
			} else {
				// --- 指数/大宗/外汇/国债监控逻辑：整数百分比突破 ---
				const levelKey = `idx_level_${price.symbol}_${today}`;
				const lastLevel = states[levelKey] || 0;
				// 计算当前涨跌幅的整数部分 (如 1.2% -> 1, -1.5% -> -1)
				const currentPercent = price.percent;
				const currentLevel = currentPercent > 0 ? Math.floor(currentPercent) : Math.ceil(currentPercent);
				// 当绝对值大于等于 1% 且 整数位发生变化时触发
				if (Math.abs(currentLevel) >= 1 && currentLevel !== lastLevel) {
					let remark = '市场指数大幅波动，请留意风险。';
					if (price.market === 'ENERGY') {
						remark = '能源大宗商品价格波动较大，请密切关注。';
					} else if (price.market === 'FOREX') {
						remark = '外汇汇率波动较大，请关注外汇波动风险。';
					} else if (price.market === 'BOND') {
						remark = '国债收益率变动较大，请关注债市动态。';
					}

					await this.sendAlertToWechat({
						name: price.name,
						price: `${price.current} (${price.percent}%)`,
						detail: `涨跌幅到: ${currentLevel}% (当前: ${currentPercent}%)`,
						remark: remark
					}, price.symbol);
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
		const storage = await this.upstashService.getPrice(KEY_MONITOR_STATE);
		return (storage?.data as Record<string, number>) || {};
	}

	private async saveStates(states: Record<string, number>): Promise<void> {
		await this.upstashService.savePrice(KEY_MONITOR_STATE, states, 'monitor');
	}

	private async sendAlertToWechat(priceAlert: PriceAlert, symbol: string): Promise<void> {
		// 限制只允许黄金和A股三大指数的通知，规避其他通知以减少推送频率
		const isGold = priceAlert.name.includes('黄金') || priceAlert.name.includes('金') || symbol === 'hf_XAU';
		const isAShareThreeIndices = ['sh000001', 'sz399001', 'sz399006'].includes(symbol);

		if (!isGold && !isAShareThreeIndices) {
			console.log(`[Monitor] Skip notification for ${priceAlert.name} (${symbol}) to avoid high frequency alerts.`);
			return;
		}

		const toUserId = this.env.WX_TO_USERID;
		// 黄金使用特定的模板，其他商品或指数使用通用模板
		const templateId = priceAlert.name.includes('金') ? '-SAGVkPxKhCTCZcXZavNvaBMJUy7SdMWizNl7e8Iw88' : 'Rs1nTsKg3kiUrOeMAng9UkauEL6BwyUgOHp0DqiccxM';

		// 动态构造详情页 URL (路径式路由)
		const detailUrl = `https://price-pole.szhangbiao.cn/monitor/${symbol}`;

		await this.wechatService.sendPriceAlert(toUserId, templateId, priceAlert, detailUrl);
	}

	/**
	 * 更新并合并最新价格到 Redis (公开方法，支持外部同步)
	 */
	public async updateLatestPrices(newPrices: MarketPrice[]): Promise<void> {
		// 1. 从 Redis 读取现有缓存
		const storage = await this.upstashService.getPrice(KEY_LATEST_PRICES);
		let priceMap: Record<string, MarketPrice> = {};

		if (storage && Array.isArray(storage.data)) {
			storage.data.forEach((p: MarketPrice) => {
				priceMap[p.symbol] = p;
			});
		}

		// 2. 将新获取的价格合并进去 (覆盖旧值)
		newPrices.forEach(p => {
			priceMap[p.symbol] = p;
		});

		// 3. 写回 Redis (永不过期或设置较长 TTL)
		const allPrices = Object.values(priceMap);
		await this.upstashService.savePrice(KEY_LATEST_PRICES, allPrices, 'monitor');
	}

	/**
	 * 获取 Redis 中的最新价格列表
	 */
	public async getLatestPricesCached(): Promise<MarketPrice[]> {
		const storage = await this.upstashService.getPrice(KEY_LATEST_PRICES);
		return (storage?.data as MarketPrice[]) || [];
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

	// 同步到 Redis 缓存
	await handler.updateLatestPrices(data);

	return c.json({
		success: true,
		count: data.length,
		data: symbols.length === 1 ? data[0] : data
	});
}

/**
 * 接口处理器：获取 Redis 中的所有最新价格快照
 */
export async function getAllLatestPrices(c: Context<{ Bindings: Env }>) {
	const handler = new MonitorHandler(c.env);
	const data = await handler.getLatestPricesCached();
	return c.json({
		success: true,
		count: data.length,
		data: data
	});
}

/**
 * 接口处理器：从 Redis 缓存或实时获取单个标的的行情
 */
export async function getSingleMarketData(c: Context<{ Bindings: Env }>) {
	const symbol = c.req.query('symbol');
	const force = c.req.query('force') === 'true'; // 是否强制从新浪实时获取

	if (!symbol) return c.json({ success: false, message: '缺少 symbol 参数' }, 400);

	const handler = new MonitorHandler(c.env);
	let price: MarketPrice | undefined;

	if (force) {
		// 强制实时获取
		const data = await handler.getSymbolsData([symbol]);
		price = data && data.length > 0 ? data[0] : undefined;
		// 实时获取的数据也同步更新一下全量快照中的这一项（可选）
	} else {
		// 默认从 Redis 缓存获取
		const allPrices = await handler.getLatestPricesCached();
		price = allPrices.find(p => p.symbol === symbol);
	}

	return c.json({
		success: true,
		data: price || null,
		isOpen: price ? isMarketOpen(price.market) : false,
		source: force ? 'sina' : 'redis'
	});
}
