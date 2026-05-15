import { PriceData, PriceAlert } from '../types/price';

export class WechatSendService {

    private readonly WX_SEND_API = 'https://wxsend.szhangbiao.cn/api/wechat/wxprice';

    async sendWxPrice(toUserId: string, templateId: string, data: PriceData) {
        // 1. 格式化股票数据
        // 示例: "3874.91(+0.11%),13154.41(-0.64%),3132.93(-1.36%)"
        const stockValue = data.stocks?.map(s => {
            const plus = s.change >= 0 ? '+' : '';
            return `${s.current.toFixed(2)}(${plus}${s.percent.toFixed(2)}%)`;
        }).join(',') || '暂无数据';

        // 2. 格式化黄金数据
        // 示例: "黄金价格：974.90(0.26%)"
        let goldValue = '暂无数据';
        if (data.gold) {
            goldValue = `黄金价格：${data.gold.latestpri}(${data.gold.limit})`;
        }

        // 3. 格式化汇率数据
        // 示例: "汇率：美元->人民币：7.0433"
        let rateValue = '暂无数据';
        if (data.exchangeRate) {
            rateValue = `${data.exchangeRate.currencyF_Name}->${data.exchangeRate.currencyT_Name}：${data.exchangeRate.result}`;
        }

        const payload = {
            toUserId: toUserId,
            templateId: templateId,
            templateData: {
                stock: {
                    value: stockValue
                },
                gold: {
                    value: goldValue
                },
                rate: {
                    value: rateValue
                }
            },
            url: "https://price-pole.szhangbiao.cn"
        };

        try {
            const response = await fetch(this.WX_SEND_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Wechat API call failed: ${response.status} ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to send wechat notification:', error);
            throw error;
        }
    }

    public async sendPriceAlert(toUserId: string, templateId: string, priceAlert: PriceAlert) {
        const payload = {
            toUserId: toUserId,
            templateId: templateId,
            templateData: {
                keyword1: { value: priceAlert.name },
                keyword2: { value: priceAlert.price },
                keyword3: { value: priceAlert.detail },
                remark: { value: priceAlert.remark }
            },
            url: "https://price-pole.szhangbiao.cn"
        };
        try {
            const response = await fetch(this.WX_SEND_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Wechat API call failed: ${response.status} ${errorText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to send wechat notification:', error);
            throw error;
        }
    }
}
