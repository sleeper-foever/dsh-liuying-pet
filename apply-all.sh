#!/usr/bin/env bash
# 按顺序重打全部宠物补丁（目标默认是已安装插件，可用 DSH_PET_PKG 覆盖）
set -euo pipefail
PKG="${DSH_PET_PKG:-$HOME/.dsh/profiles/web/node_modules/@linxin666/dsh-pet}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PATCHES=(
  patch-dsh-pet           # 11 行扩展轨
  patch-dsh-pet-ranks     # 好感度等级（每10点一级）
  patch-dsh-pet-difficulty    # 获取难度递增
  patch-dsh-pet-hover     # 悬停变身
  patch-dsh-pet-interact  # 单击/双击/右键/滚轮
  patch-dsh-pet-chat      # 大模型对话
  patch-dsh-pet-fx        # 好感度特效 + 启动问候
  patch-dsh-pet-glow      # 呼吸光效
  patch-dsh-pet-care      # 关心/问候语言包
  patch-dsh-pet-vanish    # 隐藏消散 + 召唤光柱
  patch-dsh-pet-mousefx   # 鼠标光子/拖尾/水波
  patch-dsh-pet-smooth    # 流畅度优化
  patch-dsh-pet-clarity   # 清晰度 + 帧数提升
  patch-dsh-pet-transition   # 动作衔接过渡
  patch-dsh-pet-sound     # 点击音效
)

for p in "${PATCHES[@]}"; do
  echo "===== $p ====="
  node "$DIR/$p.mjs" --pkg "$PKG"
done

echo
echo "✔ 全部补丁已重新应用。请重启 DSH Web。"
