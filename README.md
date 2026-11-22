# 李氏家谱 · 家乘 JIACHENG（可正式使用）

温润纸本、松柏绿与朱印红的家族在线数字化族谱系统，专为**李氏一脉**定制，已清空全部演示数据，开箱即可录入真实家族世系。

## 核心特性

- **家谱总览**：真实数据库动态统计（世代、族人数、春秋跨度）、世系缩略图、最新家族大事记与故事小传。
- **李氏世系图**：分代窗口、多代世系图谱、分支展开/折叠、平移与双指缩放、列表模式、定位到我。
- **族人名录**：姓名、字辈、别名、拼音首字母检索、世代筛选、录入状态筛选。
- **人物详情与生平小传**：世系链追溯、直系与旁系至亲一览、双向白话亲缘称谓、原谱出处并排对照。
- **本机「我是谁」**：纯前端双向称谓计算与白话亲缘路径，隐私不上传。
- **编修与录入**：支持新增始祖、增补子女、双历生卒换算（农历转公历、闰月、时辰解析）、父系/母系关系循环校验、整支隐私隐藏、软删除与回收站恢复、历史快照按人回滚。
- **老谱数字化工作台**：原图缩放旋转、原文逐字照录、关联人物条目、校对状态管理。
- **分享与出版**：一键生成朋友圈长图、A4 行传体谱书排版与浏览器直接打印生成 PDF。
- **安全备份与迁移**：全量数据 JSON 导出与恢复（含循环校验与事务保证）、通用 GEDCOM 5.5.1 导出、影像包打包下载。

## 数据库与 Cloudflare D1 支持

本项目底层已全面采用与 **Cloudflare D1** 100% 兼容的 SQLite/D1 架构（基于 Drizzle ORM）。

> 📖 **完整部署教程**：请参阅 [Cloudflare 完整部署与 SQL 初始化指南](./docs/CLOUDFLARE_DEPLOYMENT.md)，包含详细步骤命令、初始化 SQL 全文、备份与运维指引。

1. **本地开箱即用（免配置）**：
   - 默认使用 SQLite（`.data/jiacheng.db`），启动即自动初始化数据表，无需安装外部数据库服务。
   - 数据完全独立持久化，可通过环境变量 `SQLITE_PATH` 自定义文件路径。

2. **部署到 Cloudflare D1 快速命令**：
   - 数据表结构定义完全基于 SQLite/D1（位于 `src/db/schema.ts`）。
   - 初始化 D1 SQL 迁移文件已就绪：`drizzle/migrations/0000_init.sql`。
   - 使用 Wrangler 创建并初始化 D1 数据库：
     ```bash
     # 1. 创建 D1 数据库
     npx wrangler d1 create jiacheng-d1

     # 2. 将返回的 database_id 填入 wrangler.jsonc

     # 3. 执行建表脚本初始化远程 D1
     npx wrangler d1 execute jiacheng-d1 --remote --file=./drizzle/migrations/0000_init.sql

     # 4. 构建并发布到 Cloudflare
     npx @opennextjs/cloudflare
     npx wrangler deploy
     ```
   - 部署到 Cloudflare Workers / Pages 时，绑定名为 `DB` 的 D1 即可直接读写云端数据库。

## 安全与权限控制

系统通过两道安全口令保护家族真实隐私，可在部署平台环境变量中设置：

- `ACCESS_CODE`：全站访客访问码。配置后，访客需先输入口令验证才能浏览家谱内容。
- `ADMIN_PASSWORD`：独立编修管理密码。配置后，仅持有管理密码者才可新增、修改、删除族人或导入导出备份。

未配置 `ADMIN_PASSWORD` 时，系统处于初次建谱维护模式；建议正式上线时在部署环境中配置上述口令。

## 本地开发与运行

1. 安装依赖：`npm install`
2. 运行开发服务：`npm run dev`
3. 访问 `http://localhost:3000` 开始录入李氏第一代始祖。
4. 代码检查与构建：
   - 类型检查：`npm run typecheck`
   - 构建生产版本：`npm run build`
   - 规则与历法核心测试：`npx tsx scripts/core-check.ts`
