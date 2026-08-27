# 流萤 · Liuying (DSH 宠物)

一个可直接安装到 DeepSeek Harness 的 sprite2d 宠物插件包：8 列 × 9 行 × 192×208，
遵循 9 行动画契约（idle / running-right / running-left / waving / jumping / failed /
waiting / running / review），清单格式 v2（petManifestVersion 2）。

![idle](./assets/liuying/previews/idle.gif)

## 一键安装

```bash
# 方式一：一行命令（无需克隆，直接执行）
curl -fsSL https://raw.githubusercontent.com/USER/REPO/main/install.sh \
  | LIUYING_PET_BASE=https://raw.githubusercontent.com/USER/REPO/main bash

# 方式二：克隆后安装
git clone https://github.com/USER/REPO.git
cd REPO && bash install.sh
```

> 把 `USER` / `REPO` 换成你的 GitHub 用户名和仓库名。

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
│   ├── spritesheet.webp        # 9 行无损图集 1536×1872
│   └── previews/*.gif          # 9 条轨道预览
├── README.md
└── LICENSE
```

## 工作原理

- 用户目录模式：把 `assets/liuying/` 复制到 `$DSH_HOME/pets/liuying/`（默认 `~/.dsh/pets/liuying`），
  备份并切换 `pet.json` / `settings.yaml` 的 `petId`。
- 插件模式：把资产复制到 `$DSH_HOME/profiles/web/node_modules/@linxin666/dsh-pet/assets/liuying/`，
  成为宠物插件内置宠物（适合已安装 dsh-web-ui-all 全家桶的用户）。
- 远程模式：`curl` 管道执行时自动从 `LIUYING_PET_BASE` 下载所需文件到临时目录再安装。

## 注意

- 当前 DSH 的 sprite2d 渲染器只播放固定 9 行；原精灵表第 10–11 行扩展帧不会被播放。
- 素材版权：本包 LICENSE 为 MIT；请确认角色素材的再分发授权后再公开分享/商用。

## 卸载

```bash
rm -rf ~/.dsh/pets/liuying          # 或 ~/.dsh/profiles/web/node_modules/@linxin666/dsh-pet/assets/liuying
# 并把 ~/.dsh/pet.json 与 ~/.dsh/settings.yaml 里的 petId 改回你想用的宠物
```
