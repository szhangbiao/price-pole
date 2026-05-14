import { PriceHandler } from '../handler/priceHandler';
import { EmailService } from '../service/emailService';
import { WechatSendService } from '../service/wechatSend';
import { isMarketOpen } from '../utils/marketUtils';
import { MonitorHandler } from '../handler/monitorHandler';

/**
 * 检查是否应该跳过当前触发时间
 * @param scheduledTime 触发时间戳
 * @returns true 表示应该跳过，false 表示应该执行
 */
function shouldSkipScheduledTask(scheduledTime: number): boolean {
    const now = new Date(scheduledTime);
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();

    // 跳过上午 9:00（UTC 01:00）
    if (utcHour === 1 && utcMinute === 0) {
        console.log('跳过上午 9:00 的触发');
        return true;
    }

    return false;
}

/**
 * 检查是否需要发送邮件
 * @param scheduledTime 触发时间戳
 * @returns true 表示需要发送邮件
 */
function shouldSendEmail(scheduledTime: number): boolean {
    const now = new Date(scheduledTime);
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();

    // 北京时间 14:50（UTC 6:50）发送邮件
    return utcHour === 6 && utcMinute === 50;
}

/**
 * 检查是否需要发送微信消息
 * @param scheduledTime 触发时间戳
 * @returns true 表示需要发送微信消息
 */
function shouldSendWxMessage(scheduledTime: number): boolean {
    const now = new Date(scheduledTime);
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();

    // 北京时间 15:30（UTC 7:30）和 14:50（UTC 6:50）发送微信消息
    return (utcHour === 7 && utcMinute === 30) || (utcHour === 6 && utcMinute === 50);
}

/**
 * 处理定时任务
 */
export async function handleScheduledTask(event: ScheduledEvent, env: Env): Promise<void> {
    const scheduledDate = new Date(event.scheduledTime);
    console.log('定时任务触发，时间:', scheduledDate.toISOString());

    // 1. 判断是否需要执行“旧业务”的价格刷新
    // 条件：如果是通知发送时间，或者 A股市场处于开盘时段
    const isNotifyTime = shouldSendEmail(event.scheduledTime) || shouldSendWxMessage(event.scheduledTime);
    const isCNMarketOpen = isMarketOpen('CN', scheduledDate);
    
    // 只有在开盘时间或者需要发送通知的时间才去刷新价格
    if (isCNMarketOpen || isNotifyTime) {
        console.log('符合刷新条件，开始刷新价格数据...');
        
        // 检查是否应该跳过此次触发（保留原逻辑：跳过上午9点）
        if (shouldSkipScheduledTask(event.scheduledTime)) {
            // 注意：如果 9:00 是通知时间则不能跳过，但目前通知都在下午，所以安全
        } else {
            const priceHandler = new PriceHandler(env);
            // 强制刷新价格数据
            const data = await priceHandler.getPriceData('request_data', true);

            if (data) {
                console.log('价格数据更新成功');
                
                // 2. 检查并执行通知逻辑 (邮件/微信)
                if (shouldSendEmail(event.scheduledTime)) {
                    console.log('触发每日邮件发送任务...');
                    const emailService = new EmailService();
                    await emailService.sendPriceHtmlEmail('shizhangbiao@booslink.cn', data);
                }

                if (shouldSendWxMessage(event.scheduledTime)) {
                    console.log('触发每日微信消息发送任务...');
                    const wechatSendService = new WechatSendService();
                    await wechatSendService.sendWxPrice(env.WX_TO_USERID, env.WX_TEMPLATE_ID, data);
                }
            }
        }
    } else {
        console.log('当前非交易时段且无通知任务，跳过价格刷新');
    }

    // 3. 执行新业务监控逻辑 (独立于旧业务)
    try {
        const monitorHandler = new MonitorHandler(env);
        await monitorHandler.runMonitor();
    } catch (error) {
        console.error('监控系统运行出错:', error);
    }
}
