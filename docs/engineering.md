# NUFE-Schedule 工程化计划

## 已落地

- 用状态式算法分割合并的 Set-Cookie 头，兼容 Expires 日期中的逗号及带引号的值；不改变 Cookie 域名白名单和本地存储。
- 新增不依赖 Scripting 模拟宿主的 Cookie / 日历 Diff 纯逻辑测试，原模拟测试继续保留。
- GitHub Actions 在 PR 和 main 自动测试；每次 `main` 提交后，测试通过就更新唯一的稳定 Release 中的 `NUFE-Schedule.zip`，不需要创建新版本号或新 Release。
- 可运行 `bash scripts/package.sh` 生成 `dist/NUFE-Schedule.zip`。

## 发布机制与兼容性

正式固定下载地址为 `https://github.com/b7f2d/NUFE-Schedule/releases/download/stable/NUFE-Schedule.zip`。GitHub Release 必须关联 Tag，因此只在首次发布时创建一次内部固定标签 `stable`，页面标题始终是 `NUFE-Schedule`；以后覆盖同一个 ZIP 附件。旧 Raw 地址 `https://raw.githubusercontent.com/b7f2d/NUFE-Schedule/main/NUFE-Schedule.zip` 暂时保留，以免已有导入失效，但它可能不再跟随未来提交更新。首次发布与后续覆盖都必须先通过完整测试；测试失败则不替换现有 Release 资产。 发行页面的项目说明统一维护在 `docs/release-notes.md`，自动发布过程会同步更新该说明，以保证公开内容与项目功能保持一致。

## 技术评估与后续改进方向

1. 模块化：当前 2300 多行包含分发许可证；后续将无宿主依赖的纯函数逐步抽离，再打包为原 Scripting 单文件，不一次性重写 CAS 与日历事务。
2. TypeScript：`@ts-nocheck` 仍保留；后续应先逐步定义课程、学期、事务及宿主 API 类型，再在模块层逐步开启严格检查。
3. CAS 表单：已有字段缺失错误；需要脱敏真实页面样本才能安全适配可能的结构变化，不猜测加密参数。
4. 周次：目前实际使用学校 JSON 的 `weekIndexes` 整数数组，而非周次文字，不必引入未经需要的文本 WeekParser。
5. 日历：已有 `state.tx`、备份、写后验证、原生事件 ID 索引与中断恢复；不使用模糊指纹认领用户自行修改的事件，以免误删私人日程。
6. 同步并发：保留 20 分钟 TTL 与运行锁，禁止并发写入日历。前台并发时提供等待与协作式取消前次任务的选择；取消请求按原任务锁 token 绑定，原任务在检查点退出后才允许新任务接手。后台限时等待，超时安全跳过。人工清理残留锁仍需确认没有正在运行的任务。

本次不改账号、Cookie、事件 ID、本地数据路径和手机导入方式。
