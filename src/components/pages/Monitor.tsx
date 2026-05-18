import type { FC } from 'hono/jsx'
import { MarketPrice } from '../../types/monitor'

const MARKET_NAMES: Record<string, string> = {
    'CN': '中国市场',
    'HK': '香港市场',
    'US': '美国市场',
    'METAL': '贵金属',
    'ENERGY': '能源/大宗',
    'GLOBAL': '全球指数',
    'FOREX': '外汇/指数'
}

const Monitor: FC<{ data: MarketPrice[] }> = ({ data = [] }) => {
    // 按市场分组
    const groups = data.reduce((acc, price) => {
        const market = price.market || 'OTHER'
        if (!acc[market]) acc[market] = []
        acc[market].push(price)
        return acc
    }, {} as Record<string, MarketPrice[]>)

    // 获取数据中的最新更新时间作为全局参考
    const latestUpdate = data.length > 0
        ? data.reduce((latest, p) => p.updateTime > latest ? p.updateTime : latest, data[0].updateTime)
        : null;

    // 排序：CN -> HK -> US -> METAL -> ENERGY -> GLOBAL -> FOREX
    const sortedMarkets = ['CN', 'HK', 'US', 'METAL', 'ENERGY', 'GLOBAL', 'FOREX']

    return (
        <div class="monitor-container">
            <div class="monitor-wrapper">
                <header class="monitor-header">
                    <div class="monitor-title">
                        <h1>市场监控中心</h1>
                        <p>实时获取全球市场最新行情快照</p>
                    </div>
                    <div class="monitor-info">
                        {latestUpdate && <div class="monitor-global-time">数据更新于: {latestUpdate}</div>}
                        <div class="monitor-source-tag">来源: 新浪财经 / Redis</div>
                    </div>
                </header>

                <div class="monitor-body">
                    {sortedMarkets.map(marketKey => {
                        const prices = groups[marketKey]
                        if (!prices || prices.length === 0) return null

                        return (
                            <section key={marketKey} class="monitor-market-section">
                                <div class="monitor-market-header">
                                    <h2>{MARKET_NAMES[marketKey] || marketKey}</h2>
                                    <span class="monitor-market-count">{prices.length}</span>
                                </div>

                                <div class="monitor-price-grid">
                                    {prices.map(price => (
                                        <a
                                            key={price.symbol}
                                            href={`/monitor/${price.symbol}`}
                                            class="monitor-price-item-card"
                                            style="text-decoration: none; display: block;"
                                        >
                                            <div class="monitor-price-item-header">
                                                <span class="monitor-price-item-name" title={price.name}>
                                                    {price.name}
                                                </span>
                                                <span class="monitor-price-item-symbol">
                                                    {price.symbol.replace('rt_hk', '').replace('gb_', '').replace('hf_', '')}
                                                </span>
                                            </div>

                                            <div class="monitor-price-item-main">
                                                <span class="monitor-price-item-value">
                                                    {price.current.toLocaleString(undefined, { 
                                                        minimumFractionDigits: price.market === 'FOREX' ? 4 : 2,
                                                        maximumFractionDigits: price.market === 'FOREX' ? 4 : 2
                                                    })}
                                                </span>
                                                <div class={`monitor-price-item-stats ${price.change >= 0 ? 'monitor-price-up' : 'monitor-price-down'}`}>
                                                    <span class="monitor-price-change">
                                                        {price.change >= 0 ? '+' : ''}{price.change.toFixed(price.market === 'FOREX' ? 4 : 2)}
                                                    </span>
                                                    <span class="monitor-price-percent">
                                                        {price.change >= 0 ? '+' : ''}{price.percent.toFixed(2)}%
                                                    </span>
                                                </div>
                                            </div>

                                            <div class="monitor-price-item-footer">
                                                <div>
                                                    <span class="monitor-footer-label">开:</span> {price.open}
                                                </div>
                                                <div class="monitor-footer-item-right">
                                                    <span class="monitor-footer-label">高:</span> {price.high}
                                                </div>
                                                <div>
                                                    <span class="monitor-footer-label">低:</span> {price.low}
                                                </div>
                                                <div class="monitor-footer-item-right monitor-footer-time">
                                                    {price.updateTime}
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </section>
                        )
                    })}
                </div>

                {data.length === 0 && (
                    <div class="monitor-empty-state">
                        <div class="monitor-empty-icon">📊</div>
                        <p class="monitor-empty-text">暂无缓存行情数据，请等待定时任务执行或手动刷新</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Monitor
