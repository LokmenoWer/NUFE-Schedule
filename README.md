# NUFE-Schedule

## 项目介绍

**NUFE-Schedule** 是面向 NUFE 学生的 iPhone 课表同步工具。项目通过学校官方认证与教务接口读取课程数据，并借助 [Scripting](https://scriptingapp.github.io/) 和 iOS「快捷指令」将课程同步至 Apple 日历，无需自行部署服务器或保持电脑在线。

- **自动维护课表**：支持多个学期，识别课程新增、调整和取消，保留必要的本地备份与同步记录。
- **清晰的日历信息**：标题显示课程名及教师姓名，地点显示教室或教学楼，备注仅显示最近一次成功同步时间。
- **本地处理登录信息**：学校认证请求由设备直接发起；成功登录后自动保存账号密码至 iCloud 可同步钥匙串，Cookie 仅存于本机。
- **桌面周课表组件**：Scripting 原生主屏幕小组件，一列一天，已下课变灰、正在上课高亮、未开始课程正常显示；读取本地已同步课表，无需重新登录。
- **定时同步**：通过快捷指令自动化执行。重复任务会被协调处理，避免同时写入日历。

> 本项目是非官方开源工具，与 NUFE 不存在官方隶属关系。学校认证方式、教务接口或 iOS 后台执行策略发生变化时，部分功能可能受到影响。

## 用户指南

### 一、安装项目

1. 在 iPhone 上安装并打开 [Scripting](https://scriptingapp.github.io/)。点击右上角的「＋」，选择「导入远程脚本」。

   <a href="docs/images/scripting-import-menu.webp"><img src="docs/images/scripting-import-menu.webp" alt="在 Scripting 中打开导入远程脚本菜单" width="330"></a>

2. 在「链接」输入框中粘贴以下地址，执行导入。该地址始终指向项目的最新安装包。

   ```text
   https://github.com/b7f2d/NUFE-Schedule/releases/download/stable/NUFE-Schedule.zip
   ```

   <a href="docs/images/scripting-remote-zip.webp"><img src="docs/images/scripting-remote-zip.webp" alt="Scripting 远程导入页面中的链接输入框" width="330"></a>

3. 导入成功后，Scripting 主界面将显示 NUFE-Schedule 项目。点击项目卡片，即可打开课表管理界面。

   <a href="docs/images/scripting-project-card.webp"><img src="docs/images/scripting-project-card.webp" alt="Scripting 主界面中的 NUFE-Schedule 项目卡片" width="330"></a>

### 二、首次配置与同步

1. 在 Scripting 中首次打开 NUFE-Schedule，按提示授权日历访问，输入你喜欢的日历名称。项目会尝试在 iCloud 中自动建立一份独立日历，并核对实际账户来源；如果无法确认属于 iCloud，会停止绑定并提示处理，不会默默改用本机日历。**该日历只用于可替换的课表，请勿混放私人活动。**
2. 后续同步按绑定日历的 ID 识别，随时可以在 Apple 日历里自由更名。原日历不可见时才会提示重新指定或新建日历，不会按名称自动选择其他日历。
3. 输入学校账号和密码完成认证，验证成功后自动保存至 iCloud 钥匙串以便 Cookie 失效时自动登录；学校要求的短信或其他验证仍需本人完成。
4. 点击「立即刷新」，然后在 Apple 日历中核对课程时间、教师姓名和地点。首次同步历史学期时，建议同时核对第一教学周的日期。

### 三、设置自动同步

1. 打开 iOS「快捷指令」，进入「自动化」，创建个人自动化，选择「日出」或其他需要的时间触发条件，并设置为「立即运行」。
2. 添加 Scripting 的「使用参数、文本、链接运行」操作，选择 NUFE-Schedule，不必填写图片、文件或额外参数。
3. 可按需关闭该操作的「运行时显示」「运行时打开」以及自动化通知，以减少执行时的界面干扰。
4. 保存后先手动执行一次，确认能够正常同步。

   <a href="docs/images/shortcuts-automation.webp"><img src="docs/images/shortcuts-automation.webp" alt="快捷指令示例：每天日出自动执行 NUFE-Schedule" width="330"></a>

> 定时同步受 iOS 后台运行条件约束，不能保证每次都在指定时刻完成。遇到验证码或二次认证时，需要打开 Scripting 手动处理。

### 四、添加桌面周课表小组件

1. 先打开 NUFE-Schedule 并成功完成一次课表同步。
2. 在 iPhone 主屏幕长按空白区域，添加 **Scripting** 小组件，推荐选择**大尺寸**以显示按星期分列的完整课表。
3. 长按组件，选择「编辑小组件」，将脚本选择为 **NUFE-Schedule**。小尺寸显示今日课程，中尺寸简要显示工作日课表，大尺寸显示更完整的一周；有周末课程时会增加对应日期列。
4. 课程结束后显示灰色，正在进行的课程高亮，未来课程保持正常颜色。同步完成会主动请求刷新组件；组件也会在上下课时间申请更新，但 iOS WidgetKit 可能延后刷新，不能保证实时到秒。

课表组件只读取 Scripting 的本地 App Group 同步缓存，不访问学校登录页面、Keychain 或日历写入 API。如显示「缓存读取失败」，先通过「远程资源 → 立即更新」更新项目；如果仍失败，请记下组件显示的 `CACHE_...` 诊断代码。代码不包含课表、账号或 Cookie，可用于定位文件权限、读取与解析异常。

### 五、日常使用与更新

在 Scripting 主界面点击 NUFE-Schedule，可使用「立即刷新」「自动登录凭据」和「运行状态」。「运行状态」只显示上次同步结果和必要提醒。需要排查问题时，点击「环境自检」按需实时检查目标日历、登录会话、凭据存储、同步任务和学校连接；自检不会提交密码或修改日历。清理异常 Cookie、导出恢复备份等操作仅在对应故障出现时提供入口，不再提供单独的详细运行记录菜单。

如果手动刷新时已有任务在运行，可以选择等待完成，或请求前一任务安全退出后再开始。本项目不会强制终止正在执行的 iOS 进程。

如需手动更新已导入的远程项目：

1. 在 Scripting 主界面找到 NUFE-Schedule，点击项目卡片右上角的「···」菜单。
2. 展开「远程资源」，选择「立即更新」，由 Scripting 重新获取项目的远程安装包。
3. 更新完成后，点击 NUFE-Schedule 打开项目，并选择「立即刷新」检查课表同步是否正常。

   <a href="docs/images/scripting-refresh-menu.webp"><img src="docs/images/scripting-refresh-menu.webp" alt="Scripting 项目菜单「远程资源」中的「立即更新」选项" width="330"></a>

远程资源仍使用上方的固定安装地址。更新时请保留现有项目与已绑定的专用日历，避免重复导入或丢失原有配置。涉及账号、日历或后台权限的异常，可在「运行状态」中查看提示。
