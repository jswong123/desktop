战线 1937-1945 v1.6.3 Windows 桌面工程

1. 解压到 D:\FrontlineDesktop 等普通目录（不要放在 Node.js 安装目录）。
2. 双击“一键生成Windows安装版.bat”。首次需要联网下载 Electron 和 electron-builder。
3. 成功后 dist 文件夹中生成 Frontline-Setup-1.6.3.exe 和 Frontline-Portable-1.6.3.exe。
4. 如需先运行开发版，双击“启动桌面开发版.bat”。
5. 桌面版 AI 记录逐条追加到 Windows 用户数据目录：%APPDATA%\frontline-1937-1945\AIData\command-learning.jsonl （实际目录由 Electron userData 决定）。
6. 原有游戏内 AI数据 按钮及浏览器本地存储仍然保留。桌面版增加独立持久 JSONL，不会因安装更新而覆盖。
7. 此工程不包含预构建的 Windows EXE；必须在 Windows 上执行脚本构建。
8. 如果 npm 下载失败，检查网络/代理配置后重试。
9. 现有浏览器 localStorage 中的历史数据不会自动迁移到桌面版；可先在旧版导出 JSONL 留存。
