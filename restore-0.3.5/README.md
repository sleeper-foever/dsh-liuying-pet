# 恢复到 0.3.5（上一版插件）

插件被更新到 0.3.6 时，整包被替换，我们打的补丁和备份全被清掉了。
用本目录把 `@linxin666/dsh-pet` 恢复为 **0.3.5 纯净原版**，再重打全部补丁，
即可回到之前「功能齐全」的状态。

## 两步恢复

```bash
cd /home/ggbond/deepseek-harness/pet/plugin-patch

# 1) 备份当前 0.3.6 → 恢复 0.3.5 纯净原版
bash restore-0.3.5/restore.sh

# 2) 按顺序重打全部 15 个补丁
bash apply-all.sh

# 3) 重启 DSH Web
```

## 说明

- `restore.sh` 会把当前 0.3.6 整包备份为 `@linxin666/dsh-pet.0.3.6.bak-<时间戳>`，
  然后恢复 0.3.5 的 `lib/` 与 `package.json`（assets / cordis.patch.yml 保留）
- `apply-all.sh` 按顺序应用：11行扩展轨 → 等级 → 难度 → 悬停 → 交互 → 对话 →
  特效/问候 → 光效 → 语言包 → 消散/召唤 → 鼠标光效 → 流畅度 → 清晰度/帧数 →
  动作衔接 → 点击音效（插帧已废弃，不装）
- 已用 0.3.5 纯净版完整演练：全部补丁应用成功，三个 lib 文件语法通过，
  最终标记（trackRows / chatWithPet / 海神 / difficulty / glow / sfx / trans / care / vanish / mouse / clarity）全部就位
- 宠物数据（`~/.dsh/pets/liuying` v1.2.0 插帧版）不受影响

## 想回纯净版（不要补丁）

只执行第 1 步（restore.sh），跳过 apply-all.sh，重启即可——那是官方 0.3.5 原版。
