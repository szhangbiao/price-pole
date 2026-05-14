import { SinaService } from '../service/sinaService';
import { isMarketOpen } from '../utils/marketUtils';
import { MonitorRule, MarketPrice } from '../types/monitor';

const KEY_MONITOR_RULES = 'monitor_rules';
const KEY_MONITOR_STATE = 'monitor_state';

export class MonitorHandler {
	private sinaService: SinaService;
	private env: Env;

	constructor(env: Env) {
		this.sinaService = new SinaService();
		this.env = env;
	}

	/**
	 * 执行监控逻辑
	 */
	async runMonitor(): Promise<void> {
		// 1. 获取规则
		const rules = await this.getRules();
		const activeRules = rules.filter((r) => r.enabled);
		if (activeRules.length === 0) return;

		// 2. 提取需要抓取的代码
		const symbols = Array.from(new Set(activeRules.map((r) => r.symbol)));

		// 3. 获取价格 (内部已处理 A/港/美不同格式)
		const prices = await this.sinaService.getMarketData(symbols);
		const priceMap = new Map(prices.map((p) => [p.symbol, p]));

		// 4. 获取报警状态 (防骚扰)
		const states = await this.getStates();

		// 5. 遍历规则进行检查
		for (const rule of activeRules) {
			const price = priceMap.get(rule.symbol);
			if (!price) continue;

			// 检查市场是否开盘 (根据价格对象中的 market 标识)
			if (!isMarketOpen(price.market)) continue;

			if (this.isTriggered(rule, price)) {
				// 检查冷却时间 (例如 1 小时)
				const lastAlert = states[rule.id] || 0;
				const now = Date.now();
				if (now - lastAlert > 1 * 60 * 60 * 1000) {
					console.log(`[触发告警] ${price.name} (${price.symbol}) 当前价: ${price.current}, 涨幅: ${price.percent}%`);

					// TODO: 在此处调用通知服务
					// const success = await this.notifyService.sendAlert(rule, price, this.env);
					// if (success) states[rule.id] = now;

					// 临时：仅更新状态
					states[rule.id] = now;
				}
			}
		}

		// 6. 保存状态
		await this.saveStates(states);
	}

	private isTriggered(rule: MonitorRule, price: MarketPrice): boolean {
		switch (rule.type) {
			case 'above':
				return price.current >= rule.threshold;
			case 'below':
				return price.current <= rule.threshold;
			case 'percent_up':
				return price.percent >= rule.threshold;
			case 'percent_down':
				return price.percent <= -rule.threshold;
			default:
				return false;
		}
	}

	private async getRules(): Promise<MonitorRule[]> {
		const data = await this.env.PRICE_DATA.get(KEY_MONITOR_RULES);
		return data ? JSON.parse(data) : [];
	}

	private async getStates(): Promise<Record<string, number>> {
		const data = await this.env.PRICE_DATA.get(KEY_MONITOR_STATE);
		return data ? JSON.parse(data) : {};
	}

	private async saveStates(states: Record<string, number>): Promise<void> {
		await this.env.PRICE_DATA.put(KEY_MONITOR_STATE, JSON.stringify(states));
	}
}
