import { PriceHandler } from '../handler/priceHandler';
import { EmailService } from '../service/emailService';
import { WechatSendService } from '../service/wechatSend';
import { isMarketOpen, isAnyMarketOpen } from '../utils/marketUtils';
import { MonitorHandler } from '../handler/monitorHandler';

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

    const isCNMarketOpen = isMarketOpen('CN', scheduledDate);
    const isHalfHourMark = scheduledDate.getUTCMinutes() % 30 === 0;
    const isNotificationTime = shouldSendEmail(event.scheduledTime) || shouldSendWxMessage(event.scheduledTime);

    // 只有在开盘时间每半个小时去刷新价格，或者在需要发送通知的时间点刷新
    if (isCNMarketOpen && (isHalfHourMark || isNotificationTime)) {
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
    } else {
        console.log('跳过价格刷新: 当前非交易时段，或不在采样/通知时间点');
    }

    // 3. 执行新业务监控逻辑 (独立于旧业务)
    // 只有在至少有一个市场开盘时才运行监控，以节省 Redis 资源
    if (isAnyMarketOpen(scheduledDate)) {
        try {
            const monitorHandler = new MonitorHandler(env);
            await monitorHandler.runMonitor();
        } catch (error) {
            console.error('监控系统运行出错:', error);
        }
    } else {
        console.log('跳过监控系统运行: 全球市场均处于休市时段');
    }
}
