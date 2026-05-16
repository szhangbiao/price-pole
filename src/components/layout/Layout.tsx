import type { FC } from 'hono/jsx'
import Navbar from './Navbar'
import Footer from './Footer'

interface LayoutProps {
  currentPath?: string;
  children?: any;
}

const Layout: FC<LayoutProps> = ({ children, currentPath = '/' }) => {
  // 根据当前路径设置导航链接的active状态
  const navLinks = [
    { href: "/", label: "首页", active: currentPath === '/' },
    { href: "/monitor", label: "监控", active: currentPath === '/monitor' },
    { href: "/about", label: "关于", active: currentPath === '/about' }
  ];

  return (
    <html>
      <head>
        <title>Price Pole</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        {/* 分模块引入CSS文件 */}
        <link rel="stylesheet" href="/global.css" />
        <link rel="stylesheet" href="/navbar.css" />
        <link rel="stylesheet" href="/cards.css" />
        <link rel="stylesheet" href="/pages.css" />
        <link rel="stylesheet" href="/components.css" />
        <link rel="stylesheet" href="/responsive.css" />
        <link rel="stylesheet" href="/monitor.css" />
      </head>
      <body>
        {/* 防闪烁脚本移到body开始处 */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                const savedTheme = localStorage.getItem('theme');
                const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
                if (theme === 'dark') {
                  document.body.classList.add('dark-theme');
                  // 立即设置图标状态
                  setTimeout(() => {
                    const darkIcon = document.querySelector('.dark-icon');
                    const lightIcon = document.querySelector('.light-icon');
                    if (darkIcon && lightIcon) {
                      darkIcon.style.opacity = '0';
                      darkIcon.style.transform = 'rotate(-180deg)';
                      lightIcon.style.opacity = '1';
                      lightIcon.style.transform = 'rotate(0deg)';
                    }
                  }, 0);
                }
              } catch (e) {
                // 静默处理错误
              }
            })();
          `
        }} />
        <Navbar links={navLinks} />
        <main>{children}</main>
        <Footer />
        <script src="/theme.js"></script>
      </body>
    </html>
  )
}

export default Layout