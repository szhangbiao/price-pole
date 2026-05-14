import { Context } from 'hono';
import { PriceHandler } from './priceHandler';
import { WechatSendService } from '../service/wechatSend';

export async function sendWxTemplateMsgToUser(c: Context<{ Bindings: Env }>) {
	try {
		const toUser = c.req.query('userId');
		const toUserId = toUser || c.env.WX_TO_USERID;
		const templateId = c.env.WX_TEMPLATE_ID;
		const priceHandler = new PriceHandler(c.env);
		const data = await priceHandler.getPriceData('request_data', false);
		if (!data) {
			return c.json(
				{
					success: false,
					message: '无法获取价格数据',
					timestamp: Date.now(),
				},
				400,
			);
		}
		const wechatService = new WechatSendService();
		const wxSendResult = await wechatService.sendWxPrice(toUserId, templateId, data);
		if (wxSendResult) {
			return c.json({
				success: true,
				message: '微信价格推送成功',
				timestamp: Date.now(),
			});
		} else {
			return c.json(
				{
					success: false,
					message: '微信价格推送失败',
					timestamp: Date.now(),
				},
				500,
			);
		}
	} catch (error) {
		return c.json(
			{
				success: false,
				message: '服务器内部错误',
				error: error instanceof Error ? error.message : '未知错误',
				timestamp: Date.now(),
			},
			500,
		);
	}
}
