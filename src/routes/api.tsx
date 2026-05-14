import { Hono } from 'hono';
import { sendWxTemplateMsgToUser } from '../handler/wechatHandler';
import { getPriceData, savePriceData, clearCache } from '../handler/priceHandler';
import { sendEmail } from '../handler/emailHandler';
import { getMarketData } from '../handler/monitorHandler';

const api = new Hono<{ Bindings: Env }>();

// 获取价格数据的主要接口
api.get('/price/request', getPriceData);
api.post('/price/post', savePriceData);
api.delete('/clearCache', clearCache);

// 市场行情数据查询接口
api.get('/market/prices', getMarketData);

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
