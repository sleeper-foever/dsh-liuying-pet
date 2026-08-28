# 流萤 · Liuying (DSH 宠物)

一个可直接安装到 DeepSeek Harness 的 sprite2d 宠物插件包：**8 列 × 11 行 × 192×208**。
前 9 行遵循标准动画契约（idle / running-right / running-left / waving / jumping /
failed / waiting / running / review）；第 10–11 行为**扩展轨**（`dancing` / `victory`，
配合仓库内的 `patch-dsh-pet.mjs` 补丁即可播放），清单格式 v2（petManifestVersion 2）。

![idle](./assets/liuying/previews/idle.gif)

## 一键安装

```bash
# 方式一：一行命令（无需克隆，直接执行）
curl -fsSL https://raw.githubusercontent.com/sleeper-foever/dsh-liuying-pet/main/install.sh | bash

# 方式二：克隆后安装
git clone https://github.com/sleeper-foever/dsh-liuying-pet.git
cd dsh-liuying-pet && bash install.sh
```

> 远程模式默认从 `raw.githubusercontent.com/sleeper-foever/dsh-liuying-pet/main` 下载；

## 安装选项

```bash
bash install.sh --plugin      # 写入已安装的 @linxin666/dsh-pet 插件 assets/（显示为「内置」）
bash install.sh --no-switch   # 安装但不切换当前宠物
```

## 安装后

1. **重启 DSH Web**（宠物注册表在启动时扫描，热更新不生效）
2. 打开 **设置 → 宠物**，选择「流萤」
3. 想改名：宠物菜单 → 改名

## 仓库结构

```text
.
├── install.sh                  # 一键安装脚本（本地/远程两种模式）
├── assets/liuying/
│   ├── pet.json                # v2 sprite2d 宠物清单
│   ├── spritesheet.webp        # 完整 11 行无损图集 1536×2288
│   └── previews/*.gif          # 11 条轨道预览（含 dancing/victory）
├── patch-dsh-pet.mjs           # 11 行扩展轨补丁（备份+修改 dsh-pet 插件）
├── patch-dsh-pet-hover.mjs     # 悬停触发 jumping/变身补丁（可选）
├── patch-dsh-pet-interact.mjs   # 交互触发动作补丁（单击/双击/右键/滚轮，可选）
├── patch-dsh-pet-chat.mjs       # 大模型对话补丁（悬停面板聊天，可选）
├── patch-dsh-pet-fx.mjs         # 好感度晋升特效 + 启动问候补丁（可选）
├── patch-dsh-pet-glow.mjs       # 宠物呼吸光效补丁（可选）
├── patch-dsh-pet-care.mjs       # 关心/问候语言包补丁（可选）
├── README.md
└── LICENSE
```

## 变身（流萤 → 萨姆）

精灵表**第 5 行（5 帧）就是变身动画**：流萤 → 光效爆发 → 萨姆机甲。
它被映射到 DSH 的 `jumping` 轨并配置了 `sequences.done`——**每次完成任务时宠物都会变身**（变身与挥手交替）。
预览：`assets/liuying/previews/jumping.gif`

**鼠标悬停也能触发变身**：运行仓库内的悬停补丁后，鼠标移到宠物身上就播放 `jumping`（变身），移开恢复：

```bash
node patch-dsh-pet-hover.mjs   # 备份 + 修改 lib/client.js；重启 DSH Web 生效
```

## 交互触发（全部 11 个动作都能玩）

运行仓库内的 `patch-dsh-pet-interact.mjs` 后：

| 操作 | 动作 |
|---|---|
| 单击 | waving（挥手） |
| 双击 | dancing（跳舞） |
| 右键 | victory（胜利） |
| 拖拽松手 | waving |
| 滚轮 | 动作展示模式：循环播放全部 11 个动作 |

```bash
node patch-dsh-pet-interact.mjs   # 备份 + 修改 lib/client.js；重启 DSH Web 生效
```

## 关心/问候语言包

运行仓库内的 `patch-dsh-pet-care.mjs` 后，宠物**每 40–90 秒随机说一句关心/问候**（「开拓者，记得多喝热水哦～」等 20 条文案）。

```bash
node patch-dsh-pet-care.mjs   # 备份 + 修改 lib/client.js；重启 DSH Web 生效
```

## 宠物光效

运行仓库内的 `patch-dsh-pet-glow.mjs` 后，宠物带**萤火呼吸光晕**（沿角色轮廓柔和脉冲，青绿荧光色，尊重系统减弱动态效果设置）。

```bash
node patch-dsh-pet-glow.mjs   # 备份 + 修改 lib/client.js；重启 DSH Web 生效
```

## 好感度获取难度递增

运行仓库内的 `patch-dsh-pet-difficulty.mjs` 后，好感度**每多 10 点获取难度提升一档**（喂食 +3→+1.2；抚摸/回合 +1→+0.4，**保底 +0.1**，收益保留小数精确累加、**显示取整无长小数**），升级节奏随之放缓。

```bash
node patch-dsh-pet-difficulty.mjs   # 备份 + 修改宿主奖励表；重启 DSH Web 生效
```

## 好感度等级（每 10 点一级）

运行仓库内的 `patch-dsh-pet-ranks.mjs` 后，等级阶梯为：

```text
幼鲸(0) → 伙伴(10) → 挚友(20) → 深海羁绊(30) → 海师(40) → 海尊(50)
→ 海宗(60) → 海王(70) → 海帝(80) → 海圣(90) → 海神(100)
```

```bash
node patch-dsh-pet-ranks.mjs   # 备份 + 修改宿主等级表；重启 DSH Web 生效
```

## 好感度特效 + 启动问候

运行仓库内的 `patch-dsh-pet-fx.mjs` 后：

- **好感度升级**：幼鲸 → 伙伴 → 挚友 → 深海羁绊，升级瞬间气泡庆祝 + victory 动画 + 放大脉冲 1.06
- **亲密度 +N 小特效**：好感度点数增加（未升级）时气泡「好感度 +N ❤️」+ 小脉冲 1.03 + 挥手
- **启动问候**：每次打开页面，宠物按时间段打招呼（早上好/中午好/下午好/晚上好，开拓者）+ 挥手

```bash
node patch-dsh-pet-fx.mjs   # 备份 + 修改 lib/client.js；重启 DSH Web 生效
```

## 大模型对话（LLM Chat）

运行仓库内的 `patch-dsh-pet-chat.mjs` 后，**悬停宠物 → 面板出现「和我说…」输入框**，回车即可和宠物聊天（回复显示在气泡里）。

- 用你 DSH 的 `DEEPSEEK_API_KEY`（环境变量或 `~/.dsh/.credentials.yaml`），密钥不出本机
- 可改模型：`DEEPSEEK_BASE_URL` / `DSH_PET_CHAT_MODEL`（默认 `deepseek-chat`）/ `DSH_PET_CHAT_SYSTEM`

```bash
node patch-dsh-pet-chat.mjs   # 备份 + 修改宿主/客户端；重启 DSH Web 生效
```

## 扩展行（第 10–11 行动画）

精灵表第 10 行（8 帧）与第 11 行（8 帧）是扩展动画，已声明为 `dancing` / `victory` 轨。
默认 DSH 渲染器只播放固定 9 行；**先打补丁再播放**（仓库已附带 `patch-dsh-pet.mjs`）：

```bash
# 方式一：克隆后打补丁
cd dsh-liuying-pet && node patch-dsh-pet.mjs

# 方式二：一行命令打补丁
curl -fsSL https://raw.githubusercontent.com/sleeper-foever/dsh-liuying-pet/main/patch-dsh-pet.mjs | node
```

补丁会自动备份 `lib/index.js`、`lib/client.js`，改完**重启 DSH Web** 生效。
不打补丁时宠物仍可正常使用（9 行），扩展轨自动忽略；回滚：`node patch-dsh-pet.mjs --revert`。

## 工作原理

- 用户目录模式：把 `assets/liuying/` 复制到 `$DSH_HOME/pets/liuying/`（默认 `~/.dsh/pets/liuying`），
  备份并切换 `pet.json` / `settings.yaml` 的 `petId`。
- 插件模式：把资产复制到 `$DSH_HOME/profiles/web/node_modules/@linxin666/dsh-pet/assets/liuying/`，
  成为宠物插件内置宠物（适合已安装 dsh-web-ui-all 全家桶的用户）。
- 远程模式：`curl` 管道执行时自动从 `LIUYING_PET_BASE` 下载所需文件到临时目录再安装。

## 注意

- 默认渲染器只播放固定 9 行；第 10–11 行扩展帧需要先运行 `patch-dsh-pet.mjs` 补丁（见「扩展行」一节）才能播放。
- 素材版权：本包 LICENSE 为 MIT；请确认角色素材的再分发授权后再公开分享/商用。

## 卸载

```bash
rm -rf ~/.dsh/pets/liuying          # 或 ~/.dsh/profiles/web/node_modules/@linxin666/dsh-pet/assets/liuying
# 并把 ~/.dsh/pet.json 与 ~/.dsh/settings.yaml 里的 petId 改回你想用的宠物
```
