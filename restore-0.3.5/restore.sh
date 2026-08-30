#!/usr/bin/env bash
# 把 @linxin666/dsh-pet 恢复为 0.3.5 纯净原版（备份当前 0.3.6）
set -euo pipefail
DSH_HOME_DIR="${DSH_HOME:-$HOME/.dsh}"
PKG="$DSH_HOME_DIR/profiles/web/node_modules/@linxin666/dsh-pet"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TS="$(date +%Y%m%d-%H%M%S)"

[ -f "$PKG/package.json" ] || { echo "错误: 找不到插件 $PKG"; exit 1; }

echo "==> 备份当前版本（0.3.6）到 $PKG.0.3.6.bak-$TS"
cp -r "$PKG" "$PKG.0.3.6.bak-$TS"

echo "==> 恢复 0.3.5 纯净版 lib 与 package.json"
cp -f "$SRC/package.json" "$PKG/package.json"
cp -f "$SRC/lib/client.js" "$SRC/lib/client.js.map" "$SRC/lib/index.js" "$SRC/lib/invariant.js" "$SRC/lib/live2d-vendor.js" "$SRC/lib/live2d-vendor.js.map" "$SRC/lib/state-DrMX22GL.js" "$PKG/lib/"
rm -rf "$PKG/lib/types"
cp -r "$SRC/lib/types" "$PKG/lib/types"

echo
echo "✔ 已恢复 0.3.5 纯净原版（assets/cordis.patch.yml 保留不动）"
echo "下一步：运行 apply-all.sh 重打全部补丁，然后重启 DSH Web。"
