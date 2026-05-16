import { Hono } from 'hono';
import { sendWxTemplateMsgToUser } from '../handler/wechatHandler';
import { getPriceData, savePriceData, clearCache } from '../handler/priceHandler';
import { sendEmail } from '../handler/emailHandler';
import { getMarketData, MonitorHandler, getSingleMarketData } from '../handler/monitorHandler';

const api = new Hono<{ Bindings: Env }>();

// 获取价格数据的主要接口
api.get('/price/request', getPriceData);
api.post('/price/post', savePriceData);
api.delete('/clearCache', clearCache);

// 市场行情数据查询接口
api.get('/market/prices', getMarketData);

// 获取单个标的实时行情 (用于详情页 1s 轮询)
api.get('/market-data', getSingleMarketData);

// 监控任务手动触发接口 (用于本地测试)
api.get('/monitor/run', async (c) => {
	const handler = new MonitorHandler(c.env);
	await handler.runMonitor();
	return c.json({ success: true, message: '监控逻辑执行完成' });
});

// 邮件测试接口
api.get('/email', sendEmail);

// 微信价格推送接口
api.get('/wxPrice', sendWxTemplateMsgToUser);

// 健康检查接口
api.get('/health', (c) => {
	return c.json({
		success: true,
		message: 'API 服务正常',
		timestamp: Date.now(),
		version: '1.0.1',
	});
});

export default api;
