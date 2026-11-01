# NUFE-Schedule 工程化计划

## 已落地

- 用状态式算法分割合并的 Set-Cookie 头，兼容 Expires 日期中的逗号及带引号的值；不改变 Cookie 域名白名单和本地存储。
- 新增不依赖 Scripting 模拟宿主的 Cookie / 日历 Diff 纯逻辑测试，原模拟测试继续保留。
- GitHub Actions 在 PR 和 main 自动测试；向仓库推送 `v*` 标签后，测试通过才打包三个入口文件并发布固定名称的 ZIP 到 Releases。
- 可运行 `bash scripts/package.sh` 生成 `dist/NUFE-Schedule.zip`。

## 兼容与发布

旧安装地址 `https://raw.githubusercontent.com/b7f2d/NUFE-Schedule/main/NUFE-Schedule.zip` 保持不变。首次成功发布后，Release 固定链接是 `https://github.com/b7f2d/NUFE-Schedule/releases/latest/download/NUFE-Schedule.zip`。在真机核验之前不删除旧 ZIP；工作流不会自行创建标签。

## Gemini 建议的技术取舍

1. 模块化：当前 2300 多行包含分发许可证；后续将无宿主依赖的纯函数逐步抽离，再打包为原 Scripting 单文件，不一次性重写 CAS 与日历事务。
2. TypeScript：`@ts-nocheck` 仍保留；后续应先逐步定义课程、学期、事务及宿主 API 类型，再在模块层逐步开启严格检查。
3. CAS 表单：已有字段缺失错误；需要脱敏真实页面样本才能安全适配可能的结构变化，不猜测加密参数。
4. 周次：目前实际使用学校 JSON 的 `weekIndexes` 整数数组，而非周次文字，不必引入未经需要的文本 WeekParser。
5. 日历：已有 `state.tx`、备份、写后验证、原生事件 ID 索引与中断恢复；不使用模糊指纹认领用户自行修改的事件，以免误删私人日程。
6. 同步锁：已有 20 分钟 TTL 和人工确认的残留锁清理；改成 5 分钟可能让仍在运行的长任务竞争。

本次不改账号、Cookie、事件 ID、本地数据路径和手机导入方式。
