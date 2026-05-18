/**
 * 监控详情页 - 客户端调度逻辑 (时区修正版)
 */
(function () {
    "use strict";

    function initMonitorDetail() {
        const card = document.getElementById('price-card');
        if (!card) return;

        const symbol = card.getAttribute('data-symbol');
        const market = card.getAttribute('data-market');
        let lastPrice = parseFloat(card.getAttribute('data-last-price'));

        const priceEl = document.getElementById('current-price');
        const changeBox = document.getElementById('change-box');
        const changeEl = document.getElementById('price-change');
        const percentEl = document.getElementById('price-percent');
        const highEl = document.getElementById('price-high');
        const lowEl = document.getElementById('price-low');
        const openEl = document.getElementById('price-open');
        const lastCloseEl = document.getElementById('price-last-close');
        const volumeEl = document.getElementById('price-volume');
        const amountEl = document.getElementById('price-amount');
        const high52El = document.getElementById('price-high52');
        const low52El = document.getElementById('price-low52');
        const timeEl = document.getElementById('update-time');

        const refreshBtn = document.getElementById('refresh-btn');
        const actionsBox = document.getElementById('detail-actions');
        const marketStatus = document.getElementById('market-status');
        const statusText = document.getElementById('status-text');
        const pollingTip = document.getElementById('polling-tip');

        let pollInterval = null;

        /**
         * 健壮的北京时间获取逻辑
         */
        function getBeijingInfo() {
            const now = new Date();
            // 使用 Intl 提取精确的分量，避免字符串解析兼容性问题
            const options = {
                timeZone: 'Asia/Shanghai',
                hour12: false,
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                weekday: 'narrow' // 用于辅助某些逻辑，主要还是靠 Date 对象
            };

            try {
                const formatter = new Intl.DateTimeFormat('en-US', options);
                const parts = formatter.formatToParts(now);
                const info = {};
                parts.forEach(p => info[p.type] = p.value);

                // Date 对象在 Asia/Shanghai 下的真实星期
                // 解决：通过 offset 重新计算一个准确的 Date 对象
                const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
                const bjDate = new Date(utc + (3600000 * 8));

                return {
                    day: bjDate.getDay(),
                    hour: parseInt(info.hour),
                    min: parseInt(info.minute),
                    currentTime: parseInt(info.hour) * 100 + parseInt(info.minute)
                };
            } catch (e) {
                console.error('Time parsing error:', e);
                // 降级方案：直接使用本地时间
                return {
                    day: now.getDay(),
                    currentTime: now.getHours() * 100 + now.getMinutes()
                };
            }
        }

        /**
         * 客户端开盘时间判断逻辑 (基于北京时间)
         */
        function checkMarketOpen(marketType, symbol = '') {
            const { day, currentTime } = getBeijingInfo();
 
            // 周末判断
            if (day === 0 || day === 6) {
                if (marketType === 'METAL' || marketType === 'ENERGY' || marketType === 'FOREX' || marketType === 'BOND') {
                    if (day === 6 && currentTime < 600) return true;
                }
                return false;
            }

            switch (marketType) {
                case 'CN':
                    return (currentTime >= 930 && currentTime <= 1130) || (currentTime >= 1300 && currentTime <= 1500);
                case 'HK':
                    return (currentTime >= 930 && currentTime <= 1200) || (currentTime >= 1300 && currentTime <= 1600);
                case 'US':
                    return (currentTime >= 2130 || currentTime <= 400);
                case 'METAL':
                case 'ENERGY':
                case 'FOREX':
                case 'BOND':
                    // 国际期货、外汇及全球国债：周一凌晨 06:00 开盘
                    if (day === 1 && currentTime < 600) return false;
                    return true;
                case 'GLOBAL':
                    return (currentTime >= 800 && currentTime <= 1430);
                default:
                    return true;
            }
        }

        function formatVolume(vol) {
            if (!vol || vol === 0) return '--';
            if (vol > 100000000) return (vol / 100000000).toFixed(2) + ' 亿';
            if (vol > 10000) return (vol / 10000).toFixed(2) + ' 万';
            return vol.toLocaleString();
        }

        async function fetchPrice(force = false) {
            if (force && refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i>';
            }

            try {
                const url = `/api/market-data?symbol=${symbol}${force ? '&force=true' : ''}`;
                const res = await fetch(url);
                const result = await res.json();

                if (result.success && result.data) {
                    const data = result.data;
                    const isHighPrecision = market === 'FOREX' || market === 'BOND';

                    priceEl.innerText = data.current.toLocaleString(undefined, {
                        minimumFractionDigits: isHighPrecision ? 4 : 2,
                        maximumFractionDigits: isHighPrecision ? 4 : 2
                    });
                    const isUp = data.change >= 0;
                    changeBox.className = 'detail-change-box ' + (isUp ? 'price-up' : 'price-down');
                    changeEl.innerText = (isUp ? '+' : '') + data.change.toFixed(isHighPrecision ? 4 : 2);
                    percentEl.innerText = (isUp ? '+' : '') + data.percent.toFixed(2) + '%';

                    if (highEl) highEl.innerText = parseFloat(data.high).toFixed(isHighPrecision ? 4 : 2);
                    if (lowEl) lowEl.innerText = parseFloat(data.low).toFixed(isHighPrecision ? 4 : 2);
                    if (openEl) openEl.innerText = parseFloat(data.open).toFixed(isHighPrecision ? 4 : 2);
                    if (lastCloseEl) lastCloseEl.innerText = parseFloat(data.lastClose).toFixed(isHighPrecision ? 4 : 2);
                    if (volumeEl) volumeEl.innerText = formatVolume(data.volume);
                    if (amountEl) amountEl.innerText = formatVolume(data.amount);
                    if (timeEl) timeEl.innerText = data.updateTime;


                    if (data.extra) {
                        if (high52El && data.extra.high52w) high52El.innerText = data.extra.high52w;
                        if (low52El && data.extra.low52w) low52El.innerText = data.extra.low52w;
                    }

                    if (Math.abs(data.current - lastPrice) > 0.0001) {
                        priceEl.style.color = data.current > lastPrice ? '#ef4444' : '#22c55e';
                        setTimeout(() => priceEl.style.color = '', 300);
                    }
                    lastPrice = data.current;
                }
            } catch (e) {
                console.error('[Monitor] Fetch failed:', e);
            } finally {
                if (force && refreshBtn) {
                    refreshBtn.disabled = false;
                    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 实时获取最新价';
                }
            }
        }

        function scheduler() {
            const isOpen = checkMarketOpen(market, symbol);

            if (isOpen) {
                if (actionsBox) actionsBox.style.display = 'block';
                if (marketStatus) marketStatus.classList.remove('is-closed');
                if (statusText) statusText.innerText = '监控中 (60s)';
                if (pollingTip) pollingTip.innerHTML = '<i class="fas fa-info-circle"></i> 市场处于交易时段，正在每分钟同步北京时间行情。';
                fetchPrice(false);
            } else {
                if (actionsBox) actionsBox.style.display = 'none';
                if (marketStatus) marketStatus.classList.add('is-closed');
                if (statusText) statusText.innerText = '已休市';
                if (pollingTip) pollingTip.innerHTML = '<i class="fas fa-info-circle"></i> 当前处于休市时段（北京时间），已暂停自动请求。';
            }
        }

        scheduler();
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => fetchPrice(true));
        }
        setInterval(scheduler, 60000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMonitorDetail);
    } else {
        initMonitorDetail();
    }
})();
