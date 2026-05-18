import type { FC } from 'hono/jsx'
import Header from './Header'

const About: FC = () => {
  return (
    <div class="about-container">
      <Header
        title="关于系统"
        subtitle="全球市场实时监控与极值预警平台"
      />

      <div class="about-content">
        <section class="about-section">
          <h2 class="about-title">项目愿景</h2>
          <p class="about-description">
            本项目致力于打造一个轻量级、高性能的全球金融市场监控中心。通过 Cloudflare Workers 的边缘计算能力与 Upstash Redis 的持久化存储，
            我们实现了对 A 股、港股、美股以及大宗商品市场的全天候数据追踪，帮助用户在分钟级时间内掌握市场价格波动。
          </p>
        </section>

        <div class="feature-list">
          <div class="feature-item">
            <div class="feature-header">
              <div class="feature-icon"><i class="fas fa-bolt"></i></div>
              <h3 class="feature-title">全市场实时监控</h3>
            </div>
            <p class="feature-description">
              每分钟自动同步全球重要指数行情。针对活跃交易时段，详情页支持 1s 高频刷新，确保捕获每一个价格跳动。
            </p>
          </div>

          <div class="feature-item">
            <div class="feature-header">
              <div class="feature-icon"><i class="fas fa-bell"></i></div>
              <h3 class="feature-title">智能极值预警</h3>
            </div>
            <p class="feature-description">
              内置智能算法自动判定每日最高/最低点。当市场突破关键阻力或支撑位时，系统将通过微信或邮件第一时间发出通知。
            </p>
          </div>

          <div class="feature-item">
            <div class="feature-header">
              <div class="feature-icon"><i class="fas fa-clock"></i></div>
              <h3 class="feature-title">多时区智能调度</h3>
            </div>
            <p class="feature-description">
              系统逻辑严格锁定北京时间。无论您身处全球何地，监控频率都会根据各个市场的开盘/休市时段自动进行智能调节。
            </p>
          </div>

          <div class="feature-item">
            <div class="feature-header">
              <div class="feature-icon"><i class="fas fa-database"></i></div>
              <h3 class="feature-title">云端持久化存储</h3>
            </div>
            <p class="feature-description">
              采用 Upstash Redis 云数据库，不仅保障了监控状态的连续性，更通过缓存机制极大地降低了外部 API 的请求压力。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default About