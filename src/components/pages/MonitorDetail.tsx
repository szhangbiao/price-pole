import type { FC } from 'hono/jsx'
import { MarketPrice } from '../../types/monitor'

interface MonitorDetailProps {
    symbol: string;
    initialData: MarketPrice;
}

const MonitorDetail: FC<MonitorDetailProps> = ({ symbol, initialData }) => {
    // 格式化成交量显示
    const formatVolume = (vol?: number) => {
        if (!vol) return '--'
        if (vol > 100000000) return (vol / 100000000).toFixed(2) + ' 亿'
        if (vol > 10000) return (vol / 10000).toFixed(2) + ' 万'
        return vol.toLocaleString()
    }

    return (
        <div class="monitor-detail-container">
            <div class="monitor-detail-wrapper">
                <div class="monitor-detail-nav">
                    <a href="/monitor" class="back-link">
                        <i class="fas fa-chevron-left"></i> 返回监控中心
                    </a>
                </div>

                {/* 核心报价区域 - 传递 market 供 JS 进行本地时间判断 */}
                <div 
                    class="monitor-detail-card" 
                    id="price-card"
                    data-symbol={symbol}
                    data-market={initialData.market}
                    data-last-price={initialData.current}
                >
                    <div class="detail-header">
                        <div class="detail-name-box">
                            <h1 id="stock-name">{initialData.name}</h1>
                            <span class="detail-symbol" id="stock-symbol">{symbol}</span>
                        </div>
                        {/* 状态由 JS 动态注入类名和文字 */}
                        <div class="detail-status" id="market-status">
                            <span class="status-dot"></span> 
                            <span id="status-text">正在检查市场状态...</span>
                        </div>
                    </div>

                    <div class="detail-price-section">
                        <div class="detail-current-price" id="current-price">
                            {initialData.current.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div class={`detail-change-box ${initialData.change >= 0 ? 'price-up' : 'price-down'}`} id="change-box">
                            <span class="detail-change" id="price-change">
                                {initialData.change >= 0 ? '+' : ''}{initialData.change.toFixed(2)}
                            </span>
                            <span class="detail-percent" id="price-percent">
                                {initialData.change >= 0 ? '+' : ''}{initialData.percent.toFixed(2)}%
                            </span>
                        </div>
                    </div>

                    {/* 按钮区域初始设为隐藏，由 JS 根据开盘状态开启 */}
                    <div class="detail-actions" id="detail-actions" style="display: none;">
                        <button id="refresh-btn" class="refresh-btn">
                            <i class="fas fa-sync-alt"></i> 实时获取最新价
                        </button>
                    </div>

                    <div class="detail-grid">
                        <div class="detail-info-item">
                            <span class="label">最高</span>
                            <span class="value" id="price-high">{initialData.high}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="label">最低</span>
                            <span class="value" id="price-low">{initialData.low}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="label">开盘</span>
                            <span class="value" id="price-open">{initialData.open}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="label">昨收</span>
                            <span class="value" id="price-last-close">{initialData.lastClose}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="label">成交量</span>
                            <span class="value" id="price-volume">{formatVolume(initialData.volume)}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="label">成交额</span>
                            <span class="value" id="price-amount">{formatVolume(initialData.amount)}</span>
                        </div>

                        {initialData.extra?.high52w && (
                            <div class="detail-info-item">
                                <span class="label">52周最高</span>
                                <span class="value" id="price-high52">{initialData.extra.high52w}</span>
                            </div>
                        )}
                        {initialData.extra?.low52w && (
                            <div class="detail-info-item">
                                <span class="label">52周最低</span>
                                <span class="value" id="price-low52">{initialData.extra.low52w}</span>
                            </div>
                        )}
                    </div>

                    <div class="detail-update-time">
                        最后更新于: <span id="update-time">{initialData.updateTime}</span> (北京时间)
                    </div>
                </div>

                <div class="monitor-detail-tips">
                    <p id="polling-tip">
                        <i class="fas fa-info-circle"></i> 正在初始化调度器...
                    </p>
                </div>
            </div>

            <script src="/monitor-detail.js"></script>
        </div>
    )
}

export default MonitorDetail
