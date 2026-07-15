import { Hono } from 'hono'
import Layout from '../components/layout/Layout'
import Home from '../components/pages/Home'
import { About, Monitor, MonitorDetail } from '../components'
import { PriceHandler } from '../handler/priceHandler'
import { MonitorHandler } from '../handler/monitorHandler'

const router = new Hono<{ Bindings: Env }>()

// 使用JSX渲染路由
router.get('/', async (c) => {
  try {
    // 创建 PriceHandler 实例
    const priceHandler = new PriceHandler(c.env)

    // 获取价格数据
    const priceData = await priceHandler.getPriceData()

    return c.html(
      <Layout currentPath="/">
        <Home priceData={priceData} />
      </Layout>
    )
  } catch (error) {
    console.error('获取价格数据失败:', error)

    return c.html(
      <Layout currentPath="/">
        <Home error={error instanceof Error ? error.message : '获取价格数据时发生未知错误'} />
      </Layout>
    )
  }
})
router.get('/about', (c) => c.html(<Layout currentPath="/about"><About /></Layout>))
router.get('/monitor', async (c) => {
  const monitorHandler = new MonitorHandler(c.env);
  const latestPrices = await monitorHandler.getLatestPricesEnsured();

  return c.html(
    <Layout currentPath="/monitor">
      <Monitor data={latestPrices} />
    </Layout>
  )
})

router.get('/monitor/:symbol', async (c) => {
  const symbol = c.req.param('symbol');
  const monitorHandler = new MonitorHandler(c.env);
  const data = await monitorHandler.getSymbolsData([symbol]);

  if (!data || data.length === 0) {
    return c.text('未找到该标的数据', 404);
  }

  return c.html(
    <Layout currentPath="/monitor">
      <MonitorDetail symbol={symbol} initialData={data[0]} />
    </Layout>
  )
})

export default router
