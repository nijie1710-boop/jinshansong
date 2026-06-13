# 金泽快送 MVP

福州同城数码配件即时闪购平台 MVP。

## 项目结构

```txt
apps/
  user-miniapp/      用户端小程序，uni-app + Vue 3 + TypeScript
  merchant-miniapp/  商户端小程序，uni-app + Vue 3 + TypeScript
  admin-web/         后台管理系统，Next.js + React + Tailwind CSS
  api/               后端服务，NestJS + PostgreSQL + Prisma + Redis
packages/
  shared/            共享枚举、类型、DTO
  config/            共享基础配置
prisma/              Prisma schema 和 seed
infra/               本地基础设施
```

## 本地启动

```bash
pnpm install
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev:api
pnpm dev:admin
pnpm dev:user
pnpm dev:merchant
```

如果本机没有 Docker，可以用本机 PostgreSQL/Redis，只要 `.env` 中的
`DATABASE_URL` 和 `REDIS_URL` 可访问即可。

## 数据库

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## 微信小程序调试

用户端和商户端是两个独立的 uni-app 小程序工程，H5 只用于本地预览。微信开发者工具调试时先构建：

```bash
pnpm build:mp:local
```

然后分别导入：

```txt
apps/user-miniapp/dist/build/mp-weixin
apps/merchant-miniapp/dist/build/mp-weixin
```

本机已安装微信开发者工具时，也可以用脚本打开：

```bash
pnpm open:mp:user
pnpm open:mp:merchant
```

当前本地小程序包使用 `touristappid` 体验模式，适合微信开发者工具预览。因为两个本地包都没有正式 AppID，微信开发者助手可能只按 `touristappid` 显示一个入口，这是本地模式限制，不代表工程只有一个小程序。

正式区分用户端和商户端时，需要申请两个独立微信小程序 AppID，并配置到 `.env`：

```txt
MP_WEIXIN_MODE="real"
MP_WEIXIN_USER_APP_ID="用户端正式 AppID"
MP_WEIXIN_MERCHANT_APP_ID="商户端正式 AppID"
```

然后运行：

```bash
pnpm build:mp:real
```

脚本会把两个 AppID 分别写入：

```txt
apps/user-miniapp/src/manifest.json
apps/merchant-miniapp/src/manifest.json
```

需要切回本地预览时运行：

```bash
pnpm mp:local
pnpm build:mp
```

本地开发可在微信开发者工具中关闭合法域名校验，并使用 `.env` 的 `VITE_MP_API_BASE_URL`。
真机预览需要把该地址替换为 HTTPS API 域名，并在微信公众平台配置 request 合法域名。

统一验收时不要混用本地 API 和服务器 API。建议 H5、微信开发者工具、后台都连同一套服务器数据：

```bash
pnpm dev:user:server-preview
pnpm dev:merchant:server-preview
pnpm dev:admin:server-preview
pnpm build:mp:server-preview
pnpm check:env:server
```

这样用户端 H5、商户端 H5、后台页面都会请求 `http://122.51.248.210/api`，和
`pnpm build:mp:server-preview` 打出的微信小程序预览包保持同一个数据库。需要回到纯本地开发时，再分别运行
`pnpm dev:user`、`pnpm dev:merchant`、`pnpm dev:admin`，并重新构建本地 API 预览版小程序：

```bash
pnpm build:mp:local-preview
pnpm check:env:local
```

`pnpm check:env:local` / `pnpm check:env:server` 会同时检查用户端 H5、商户端 H5、后台 Web、用户端微信构建包、商户端微信构建包当前指向哪套 API，避免本地和服务器数据混看。

发布前建议先运行小程序配置自检：

```bash
pnpm check:miniapp
```

自检会检查两个小程序 AppID、微信构建产物、定位权限、API 域名和上传图片访问域名。正式模式下 `VITE_MP_API_BASE_URL` 与 `API_PUBLIC_BASE_URL` 必须是 HTTPS。

### 微信登录模式

当前默认 `WECHAT_LOGIN_MODE="mock"`，适合 H5、本地 API、微信开发者工具 `touristappid`
预览。用户端和商户端仍会调用 `/auth/*/wechat-login`，后端会生成模拟 openId，不影响订单闭环演示。

切到正式小程序前，需要：

```txt
WECHAT_LOGIN_MODE="real"
WECHAT_USER_APP_ID="用户端正式 AppID"
WECHAT_USER_APP_SECRET="用户端 AppSecret"
WECHAT_MERCHANT_APP_ID="商户端正式 AppID"
WECHAT_MERCHANT_APP_SECRET="商户端 AppSecret"
```

正式模式下后端会调用微信 `code2Session`，并在微信手机号授权 code 存在时读取手机号；商户端仍以“已审核入驻手机号”作为进入门店工作台的绑定依据。
用户端登录会绑定微信 openId；如果手机号之前由本地 mock 数据绑定，真实登录会升级为真实 openId。商户端可直接用微信手机号授权匹配入驻申请，H5 或授权失败时再手动填写入驻手机号。

切换真实登录后建议执行：

```bash
pnpm check:miniapp
pnpm build:mp:real
```

## 当前能力

- 用户端：微信小程序式双模式登录、真实商品浏览、真实地址读取、订单报价、创建订单、模拟支付、订单列表、订单详情、我的统计、优惠券和分享奖励券模拟领取。
- 商户端：微信小程序式双模式登录、入驻申请、商品提交审核、商品资料编辑、商品上下架、待接单、倒计时、接单/拒单、备货完成、骑手取货、完成订单、门店接单开关和语音提醒开关。
- 后台：模拟管理员登录、入驻审核、商品审核、订单管理、订单详情、订单人工干预、数据看板、财务统计、结算管理、风控中心、多平台即时配送配置，支持单单净利润和负利润标记。
- 后端：真实 API、Prisma 持久化、统一上传资产表、本地上传适配器、模拟支付、模拟退款流水、美团/蜂鸟/UU/顺丰同城多配送 Provider 适配层、支付后预占库存、退款/转单释放与重占库存、订单操作日志、超时自动转单、商户门店订单隔离。
- 任务：API 启动后会按 `JOB_STORE_TIMEOUT_INTERVAL_MS` 轮询处理门店 3 分钟未接单自动转单。

## 认证和权限

- 用户端、商户端、后台登录均返回后端签名 token，签名密钥来自 `JWT_SECRET`。
- 后台管理员账号写入数据库表 `admin_users`，默认账号由 `ADMIN_DEFAULT_ACCOUNT` / `ADMIN_DEFAULT_PASSWORD` 初始化。
- 商户账号写入 `merchant_accounts` 并绑定门店，商户接口会校验 `x-merchant-token` 与 `x-store-code` 是否匹配，不能跨门店读取或操作。
- 后台接口需要 `x-admin-token`；后台 Web 登录后会把 token 写入同域 Cookie，供服务端页面请求 API 时携带。

## 数据互通约束

三端必须使用同一套后端 API 和 PostgreSQL 数据，不允许用互相割裂的本地 mock 数据实现核心链路。

- 商户端新增商品后进入待审核，后台审核通过后，用户端商品列表和商品详情才可见。
- 商户端入驻可上传营业执照照片、门店门头照；商品主图和详情图走统一上传接口，当前本地存储，后续可替换 COS/OSS。
- 微信小程序真机和正式版不展示 `http://` 图片，商户本地上传图会先保存，正式运营前需要把 `API_PUBLIC_BASE_URL` 或 COS/OSS/CDN 配成 HTTPS。
- 用户端创建订单并模拟支付后，商户端待接单列表必须出现同一笔订单。
- 商户端接单、备货、骑手取货、完成订单后，用户端订单记录和后台订单管理必须同步显示状态。
- 用户端定位、地址编辑和订单报价会按后台“系统配置/服务范围”校验，当前默认只开放福州市核心城区。
- 确认订单页会返回多平台即时配送报价，默认低价骑手优先；商户端接单后会生成聚合配送任务，备货完成、取货、完成订单会同步更新配送任务状态，后台订单详情可查看平台单号、骑手信息和发单失败重试入口。
- 美团配送 Provider 已按官方开放平台接入方式预留真实 HTTP 模式：支持预发单、门店发单、取消单和状态回调映射。后台配送配置中把美团从 `mock` 切到 `http` 后，需要填写全局 `endpoint`、`AppKey`、`Secret`，并在“门店管理”里给每个门店单独绑定美团/蜂鸟的门店或商户 ID。
- 后台订单管理必须展示单单净利润，财务统计必须汇总真实订单数据。
- 后台订单详情必须能查看订单操作日志和支付/退款流水，便于后续接真实支付、退款和客服售后排查。
- 后台订单详情支持取消订单、模拟退款、强制完成；风控中心支持把异常事件标记为已处理或忽略。
- 后台页面不再使用本地 mock 兜底；API 不可用时展示空态，避免出现“假数据已互通”的误判。

## 第三方配送门店绑定

真实接入美团、蜂鸟这类配送平台时，一般是“平台级密钥 + 门店级编号”的结构：

- 平台级密钥：由金泽快送主体申请，填在后台“系统配置/配送配置”，例如美团 `AppKey`、`Secret`、接口地址。
- 门店级编号：每个入驻门店在配送平台侧对应一个门店/商户 ID，填在后台“门店管理”里的“配送门店绑定”。
- 报价和发单时，后端会先用全局平台密钥，再按订单当前门店合并该门店的 `providerShopId`、服务代码和联系电话。
- 新商户入驻审核通过后，系统会自动生成美团和蜂鸟的门店绑定占位配置，默认关闭；拿到平台门店 ID 后再启用。

如果某个门店没有绑定对应平台门店 ID，正式 HTTP 模式下该门店不能向该平台发单。开发期仍可把 Provider 保持为 `mock` 继续演示完整订单闭环。

本地 API 启动后可运行端到端数据互通验证：

```bash
pnpm test:data-flow
```

默认验证后会清理测试商品和测试订单。需要保留测试数据用于页面演示时：

```bash
KEEP_SMOKE_DATA=1 pnpm test:data-flow
```

## 生产部署准备

生产部署配置已放在：

```txt
docker-compose.prod.yml
infra/api.Dockerfile
infra/admin.Dockerfile
infra/nginx/jinshansong.conf.template
.env.production.example
docs/生产部署说明.md
```

服务器部署前先复制生产环境变量：

```bash
cp .env.production.example .env.production
pnpm check:prod
```

备案通过前可以先用公网 IP 做预部署联调，临时暴露 API 和后台端口：

```bash
docker compose --env-file .env.production \
  -f docker-compose.prod.yml \
  -f docker-compose.preview.yml \
  up -d --build postgres redis api admin nginx-preview
```

预部署默认通过 80 端口访问，后台在 `http://服务器IP`，API 在 `http://服务器IP/api`。
这只能用于联调，微信小程序正式版、支付回调和正式访问仍需要备案域名与 HTTPS。

微信登录模式可一键切换：

```bash
pnpm wechat:mock
pnpm wechat:real
```

本地 H5 和自动化测试建议保持 `mock`；微信开发者工具真机测试真实登录时再切 `real` 并重启 API。

备案前需要在微信开发者工具中测试服务器预览包时：

```bash
pnpm build:mp:server-preview
pnpm open:mp:user
pnpm open:mp:merchant
```

该构建会使用真实 AppID，并把小程序 API 指向 `http://122.51.248.210`。微信开发者工具内需要开启“不校验合法域名、TLS 版本以及 HTTPS 证书”。备案和 HTTPS 完成后改用 `pnpm build:mp:real`。

生产自检还会提示这些待完成项：

- 后台默认账号和密码不能沿用开发默认值。
- `PAYMENT_MODE=mock` 只能用于测试，正式交易需接微信支付。当前已预留 `/api/payments/runtime`
  和 `/api/payments/wechat/notify`，后台“系统配置/后台设置”也能查看支付模式和微信商户配置状态。
- 真实微信支付上线前需要补齐商户号、API v3 key、商户证书序列号、私钥文件路径和 HTTPS 回调域名；
  密钥只放服务器环境变量，不写入后台数据库。
- `UPLOAD_DRIVER=LOCAL` 可试运营，正式大量图片建议切 COS/OSS/CDN。
- `/api/health` 可查看 API、数据库、Redis、上传目录和运行模式。

## 演示账号

```txt
用户端：进入 /pages/login/index 后点击“微信手机号快捷登录”
商户端：进入 /pages/login/index，默认入驻手机号 059188000001，也可使用演示门店入口
后台：admin / admin123456
```
