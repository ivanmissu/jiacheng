# 李氏家谱 · Cloudflare D1 完整部署与初始化指南

本文档提供将《李氏家谱》（家乘 JIACHENG）部署到 **Cloudflare Workers / Pages** 并接入 **Cloudflare D1 分布式数据库**的详细步骤。按照本文档指引，您可以在数分钟内完成云端建库、执行数据表初始化并成功上线正式使用。

---

## 目录
1. [架构与前置准备](#一架构与前置准备)
2. [步骤一：创建 Cloudflare D1 数据库](#二步骤一创建-cloudflare-d1-数据库)
3. [步骤二：执行初始化 SQL 脚本建表](#三步骤二执行初始化-sql-脚本建表)
4. [步骤三：配置 Wrangler 绑定](#四步骤三配置-wrangler-绑定)
5. [步骤四：配置安全环境变量](#五步骤四配置安全环境变量)
6. [步骤五：构建与部署到 Cloudflare](#六步骤五构建与部署到-cloudflare)
7. [步骤六：上线验收与初次建谱](#七步骤六上线验收与初次建谱)
8. [数据库备份与恢复运维](#八数据库备份与恢复运维)
9. [常见问题与排错 (FAQ)](#九常见问题与排错-faq)

---

## 一、架构与前置准备

- **前端与全栈服务**：Next.js 16 (App Router) + React 19 + TypeScript
- **数据库**：Cloudflare D1（基于 SQLite 的全球分布式边缘 SQL 数据库，零冷启动、极低延迟，免费计划每日含 500 万次读与 10 万次写）
- **ORM**：Drizzle ORM（原生支持 D1 驱动与全量类型推导）

### 前置工具
1. 本地已安装 **Node.js (>= 20.0.0)** 与 **npm**。
2. 拥有一个 [Cloudflare](https://dash.cloudflare.com/) 账号。
3. 本地终端通过 Wrangler 登录 Cloudflare：
   ```bash
   npx wrangler login
   ```
   *浏览器会自动打开授权页，点击“允许”即可。*

---

## 二、步骤一：创建 Cloudflare D1 数据库

在项目根目录下打开终端，运行以下命令创建一个新的 D1 数据库（命名为 `jiacheng-d1`）：

```bash
npx wrangler d1 create jiacheng-d1
```

控制台将输出类似以下内容：
```text
✅ Successfully created DB 'jiacheng-d1' in region APAC
Created your database using D1's new storage engine.

[[d1_databases]]
binding = "DB"
database_name = "jiacheng-d1"
database_id = "xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

> ⚠️ **请妥善记下输出中的 `database_id`**，后续配置需要填入此 ID。

---

## 三、步骤二：执行初始化 SQL 脚本建表

数据库创建后为空库，需执行表结构初始化。系统内置了完整的迁移脚本 `drizzle/migrations/0000_init.sql`。

### 方式 A：通过 Wrangler 命令行一键初始化（推荐）

```bash
npx wrangler d1 execute jiacheng-d1 --remote --file=./drizzle/migrations/0000_init.sql
```

当看到 `🚣 commands executed successfully` 提示时，说明 5 张核心数据表与 6 个索引已在 Cloudflare 远程 D1 中成功创建！

### 方式 B：在 Cloudflare Dashboard 网页端执行

如果您习惯在网页控制台操作：
1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)，进入左侧菜单 **Workers & Pages** -> **D1 SQL Database**。
2. 点击刚才创建的 `jiacheng-d1` 数据库。
3. 切换到 **Console (控制台)** 选项卡。
4. 将下方完整的初始化 SQL 粘贴进输入框并点击 **Execute (执行)**：

<details>
<summary>👉 点击展开查看完整初始化 SQL 语句（drizzle/migrations/0000_init.sql）</summary>

```sql
-- 1. 族人档案表 (family_persons)
CREATE TABLE IF NOT EXISTS family_persons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'male',
  generation INTEGER NOT NULL DEFAULT 1,
  father_id TEXT,
  mother_id TEXT,
  courtesy_name TEXT NOT NULL DEFAULT '',
  art_name TEXT NOT NULL DEFAULT '',
  aliases TEXT NOT NULL DEFAULT '[]',
  birth TEXT,
  death TEXT,
  is_alive INTEGER NOT NULL DEFAULT 0,
  spouse TEXT NOT NULL DEFAULT '',
  native_place TEXT NOT NULL DEFAULT '',
  residence TEXT NOT NULL DEFAULT '',
  biography TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'recorded',
  hidden INTEGER NOT NULL DEFAULT 0,
  source_page_id TEXT,
  original TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- 2. 原谱数字化影像与照录表 (family_source_pages)
CREATE TABLE IF NOT EXISTS family_source_pages (
  id TEXT PRIMARY KEY,
  volume INTEGER NOT NULL,
  page_no INTEGER NOT NULL,
  title TEXT NOT NULL,
  image TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unrecorded',
  transcription TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

-- 3. 编修修订快照表 (family_revisions)
CREATE TABLE IF NOT EXISTS family_revisions (
  id TEXT PRIMARY KEY,
  person_id TEXT,
  name TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL
);

-- 4. 服务端安全会话表 (family_sessions)
CREATE TABLE IF NOT EXISTS family_sessions (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

-- 5. 备份与恢复事件日志表 (family_backup_events)
CREATE TABLE IF NOT EXISTS family_backup_events (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

-- 6. 核心性能索引
CREATE INDEX IF NOT EXISTS idx_family_persons_gen ON family_persons (generation);
CREATE INDEX IF NOT EXISTS idx_family_persons_father ON family_persons (father_id);
CREATE INDEX IF NOT EXISTS idx_family_persons_mother ON family_persons (mother_id);
CREATE INDEX IF NOT EXISTS idx_family_source_pages_vol ON family_source_pages (volume, page_no);
CREATE INDEX IF NOT EXISTS idx_family_revisions_created ON family_revisions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_sessions_expires ON family_sessions (expires_at);
```
</details>

### 验证建表结果

运行以下命令核对远程表是否存在：
```bash
npx wrangler d1 execute jiacheng-d1 --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```
返回应包含：
- `family_persons`
- `family_source_pages`
- `family_revisions`
- `family_sessions`
- `family_backup_events`

---

## 四、步骤三：配置 Wrangler 绑定

项目根目录已包含 `wrangler.jsonc` 配置文件。将第一步生成的 `database_id` 填入：

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "jiacheng-li-genealogy",
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-11-01",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "jiacheng-d1",
      "database_id": "填入你的-database-id-填入此处",
      "migrations_dir": "drizzle/migrations"
    }
  ]
}
```

> 💡 **提示**：数据库绑定变量名必须为大写 `DB`。

---

## 五、步骤四：配置安全环境变量

《李氏家谱》支持两级安全权限控制，防止未经授权的访客篡改真实家族数据：

1. **`ADMIN_PASSWORD`（管理口令）**：用于维护者身份验证。设置后，只有输入管理口令的人员才可以添加/修改/删除族人及导入导出备份。
2. **`ACCESS_CODE`（全站访问码，可选）**：配置后，全站启用家族门禁保护，输入该码方可阅览家谱。

### 设置加密环境变量（Secrets）

使用 Wrangler 直接将口令上传至 Cloudflare 安全存储：

```bash
# 设置维护者管理口令（必配，建议8位以上强密码）
npx wrangler secret put ADMIN_PASSWORD

# 设置全站访客访问码（选配，若希望完全开放族人阅读则可跳过）
npx wrangler secret put ACCESS_CODE
```

---

## 六、步骤五：构建与部署到 Cloudflare

### 方案 1：CLI 一键构建与发布（推荐）

1. **执行构建**（通过 OpenNext Cloudflare 适配器自动打包 Next.js）：
   ```bash
   npx @opennextjs/cloudflare
   ```
2. **部署发布**：
   ```bash
   npx wrangler deploy
   ```

发布完成后，命令行将返回公开访问链接，例如：
`https://jiacheng-li-genealogy.<your-subdomain>.workers.dev`

---

### 方案 2：Cloudflare Pages / Workers 控制台 Git 自动构建

如果您已将代码推送到 GitHub / GitLab 仓库，也可在 Cloudflare 控制台使用自动化持续部署：

1. 打开 Cloudflare 控制台 -> **Compute (Workers & Pages)** -> **Create application** -> **Pages** -> **Connect to Git**。
2. 选择本仓库。
3. 构建配置填写如下：
   - **Framework preset**：`Next.js`
   - **Build command**：`npx @opennextjs/cloudflare`
   - **Build output directory**：`.open-next/assets`
   - **Node.js Compatibility Flag**：确保开启 `nodejs_compat`。
4. 进入该项目的 **Settings (设置)** -> **Functions (函数)** -> **D1 Database Bindings**：
   - Variable name (变量名)：`DB`
   - D1 database：选择 `jiacheng-d1`
5. 进入 **Settings** -> **Environment variables**：
   - 添加 `ADMIN_PASSWORD`，加密保存。
6. 点击 **Save and Deploy** 重新触发构建。

---

## 七、步骤六：上线验收与初次建谱

部署完成后，在浏览器中打开 Cloudflare 分配的网址：

1. **验证首页**：
   - 页面标题显示为《李氏家谱 · 一脉相承，循根问祖》。
   - 首页居中展示**「录入第一代始祖」**。
2. **录入第一位始迁祖**：
   - 点击**「录入第一代始祖」**，弹出族人信息编辑框。
   - 填写姓名（如始祖姓名）、字号、生卒年（支持输入农历自动换算公历）。
   - 点击“保存族人”，提示保存成功并实时留存修订记录。
3. **查验世系图与名录**：
   - 点击侧边栏“世系图”，确认始祖节点已居中显示。
   - 点击“族人名录”，确认可以按姓名和拼音检索。
   - 点击“管理与备份”，导出全量 JSON 备份以检验数据持久化。

---

## 八、数据库备份与恢复运维

### 1. Cloudflare D1 命令行即时快照与恢复

Cloudflare D1 支持秒级自动备份与恢复，可随时通过终端执行：

```bash
# 1. 创建即时快照备份
npx wrangler d1 backup create jiacheng-d1

# 2. 列出已有备份
npx wrangler d1 backup list jiacheng-d1

# 3. 按备份 ID 恢复数据库
npx wrangler d1 backup restore jiacheng-d1 <BACKUP_ID>
```

### 2. 应用层通用备份（推荐双重备份）

登录家谱的“**管理与备份**”界面：
- **完整数据 JSON**：版本化包含全家族成员、生卒行传、原文对照与谱页清单。
- **谱页图片包 ZIP**：自动包含每张老谱原图并附带 SHA-256 完整性清单。
- **通用 GEDCOM**：支持一键导出标准 GEDCOM 5.5.1 格式，方便跨系统流转。

---

## 九、常见问题与排错 (FAQ)

### Q1: 页面打开提示 500 或无法读取数据？
- **原因**：D1 数据库未绑定或表未初始化。
- **排查**：
  1. 检查 `wrangler.jsonc` 中 `binding` 是否严格为 `"DB"`。
  2. 运行 `npx wrangler d1 execute jiacheng-d1 --remote --command="SELECT count(*) FROM family_persons;"` 确认表已创建。

### Q2: 提示“需要管理身份”无法保存数据？
- **原因**：设置了 `ADMIN_PASSWORD`，当前浏览器处于普通族人访客模式。
- **处理**：点击左下角头像或进入工作台，输入正确的维护者管理密码即可进入编修模式。

### Q3: 本地开发与远程 D1 如何切换？
- 本地直接运行 `npm run dev` 时，系统自动读取本地 `.data/jiacheng.db`（开箱即用 SQLite），不影响云端线上正式数据。
- 只有通过 `wrangler deploy` 部署上线的版本，才会连通 Cloudflare 云端 D1 数据库。
