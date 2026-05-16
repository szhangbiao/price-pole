import type { FC } from 'hono/jsx'
import type { ExchangeRateData } from '../../types/price'

interface ExchangeRateCardProps {
  exchangeRate: ExchangeRateData;
}

const ExchangeRateCard: FC<ExchangeRateCardProps> = ({ exchangeRate }) => {
  // 格式化数字显示
  const formatNumber = (num: number | string): string => {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    return isNaN(value) ? '0.0000' : value.toFixed(4);
  };

  return (
    <div class="price-card exchange-card">

      <h3><i class="fas fa-exchange-alt"></i> 汇率信息</h3>
      <div class="price-info">
        <div class="main-price">
          <span class="label">{exchangeRate.currencyF_Name} → {exchangeRate.currencyT_Name}:</span>
          <span class="value">{formatNumber(exchangeRate.exchange)}</span>
        </div>
        <div class="exchange-details">
          <div class="detail-item">
            <span class="label">基础货币:</span>
            <span class="value">{exchangeRate.currencyF}</span>
          </div>
          <div class="detail-item">
            <span class="label">目标货币:</span>
            <span class="value">{exchangeRate.currencyT}</span>
          </div>
          <div class="detail-item">
            <span class="label">汇率:</span>
            <span class="value">{formatNumber(exchangeRate.exchange)}</span>
          </div>
          <div class="detail-item">
            <span class="label">结果:</span>
            <span class="value">{exchangeRate.result}</span>
          </div>
        </div>
        <div class="update-time">更新时间: {exchangeRate.updateTime}</div>
      </div>
    </div>
  );
};

export default ExchangeRateCard;