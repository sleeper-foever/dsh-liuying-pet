#!/usr/bin/env bash
# 流萤 (liuying) · DSH 宠物一键安装脚本
# 支持两种运行方式：
#   1) 本地克隆：  bash install.sh
#   2) 远程管道：  curl -fsSL <raw install.sh URL> | LIUYING_PET_BASE=<raw 仓库根> bash
# 选项：
#   --plugin     写入已安装的 @linxin666/dsh-pet 插件 assets/（内置宠物）
#   --no-switch  安装后不切换当前宠物
set -euo pipefail

PLUGIN_MODE=0
SWITCH_PET=1
for arg in "$@"; do
  case "$arg" in
    --plugin) PLUGIN_MODE=1 ;;
    --no-switch) SWITCH_PET=0 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || pwd)"
DSH_HOME_DIR="${DSH_HOME:-$HOME/.dsh}"
PET_ID="liuying"

# ── 1. 准备宠物资产（本地存在则直接用，否则从仓库下载）────────────────────
WORK=""
if [ -f "$SCRIPT_DIR/assets/$PET_ID/pet.json" ]; then
  WORK="$SCRIPT_DIR"
else
  BASE="${LIUYING_PET_BASE:-https://raw.githubusercontent.com/sleeper-foever/dsh-liuying-pet/main}"
  echo "==> 从 $BASE 下载宠物资产 …"
  WORK="$(mktemp -d)"
  trap 'rm -rf "$WORK"' EXIT
  mkdir -p "$WORK/assets/$PET_ID/previews"
  FILES=(
    pet.json
    spritesheet.webp
    previews/idle.gif
    previews/running-right.gif
    previews/running-left.gif
    previews/waving.gif
    previews/jumping.gif
    previews/failed.gif
    previews/waiting.gif
    previews/running.gif
    previews/review.gif
  )
  for f in "${FILES[@]}"; do
    curl -fsSL "$BASE/assets/$PET_ID/$f" -o "$WORK/assets/$PET_ID/$f"
  done
fi
SRC="$WORK/assets/$PET_ID"
[ -f "$SRC/pet.json" ] || { echo "错误: 找不到宠物清单 $SRC/pet.json"; exit 1; }

# ── 2. 选择安装位置 ───────────────────────────────────────────────────────
if [ "$PLUGIN_MODE" -eq 1 ]; then
  PKG="$DSH_HOME_DIR/profiles/web/node_modules/@linxin666/dsh-pet"
  [ -f "$PKG/package.json" ] || { echo "错误: 未找到已安装的 @linxin666/dsh-pet 插件（$PKG）"; exit 1; }
  DST="$PKG/assets/$PET_ID"
  echo "==> 写入插件内置资产: $DST"
  mkdir -p "$DST/previews"
  cp -f "$SRC/pet.json"         "$DST/pet.json"
  cp -f "$SRC/spritesheet.webp" "$DST/spritesheet.webp"
  cp -f "$SRC"/previews/*.gif   "$DST/previews/"
  echo "✔ 完成。重启 DSH Web 后到 设置 → 宠物 选择「流萤」（内置）。"
  exit 0
fi

# 默认：用户宠物目录
DST="$DSH_HOME_DIR/pets/$PET_ID"
TS="$(date +%Y%m%d-%H%M%S)"
echo "==> 安装到用户宠物目录: $DST"
mkdir -p "$DST/previews"
cp -f "$SRC/pet.json"         "$DST/pet.json"
cp -f "$SRC/spritesheet.webp" "$DST/spritesheet.webp"
cp -f "$SRC"/previews/*.gif   "$DST/previews/"

if [ "$SWITCH_PET" -eq 1 ]; then
  echo "==> 备份并切换当前宠物为 $PET_ID"
  [ -f "$DSH_HOME_DIR/pet.json" ] && cp -f "$DSH_HOME_DIR/pet.json" "$DSH_HOME_DIR/pet.json.bak-$TS"
  [ -f "$DSH_HOME_DIR/settings.yaml" ] && cp -f "$DSH_HOME_DIR/settings.yaml" "$DSH_HOME_DIR/settings.yaml.bak-$TS"
  node -e '
    const fs = require("fs");
    const os = require("os");
    const dir = process.env.DSH_HOME || os.homedir() + "/.dsh";
    const f = dir + "/pet.json";
    let j; try { j = JSON.parse(fs.readFileSync(f, "utf8")); } catch { j = {}; }
    j.petId = "liuying";
    fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n");
  '
  node -e '
    const fs = require("fs");
    const os = require("os");
    const dir = process.env.DSH_HOME || os.homedir() + "/.dsh";
    const f = dir + "/settings.yaml";
    let s = ""; try { s = fs.readFileSync(f, "utf8"); } catch {}
    const re = /^(\s*petId:\s*).*$/m;
    s = re.test(s) ? s.replace(re, "$1liuying") : s + "\npet:\n  petId: liuying\n";
    fs.writeFileSync(f, s);
  '
fi

echo "✔ 完成。重启 DSH Web 后到 设置 → 宠物 选择「流萤」。"
