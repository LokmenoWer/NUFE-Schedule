# CourseSync

## 项目介绍

**CourseSync** 是基于 [Scripting](https://scriptingapp.github.io/) 的本地课表同步工具。它在 iPhone 上直接连接学校教务系统，将课程同步到 Apple 日历，并提供主屏幕课表小组件，**无需自建服务器或让电脑常驻运行**。

- **课表同步**：获取学校可用学期的课程，处理调课、补课、取消课程和重复事件；保留必要的备份与异常恢复记录。
- **日历与小组件**：使用独立的课表日历；主屏幕可查看昨天、今天和明天的课程。
- **本地运行**：登录、同步和定时触发均在设备上完成。学校 Cookie 仅存本机；成功登录后，账号密码保存至 Scripting 使用的 iCloud 可同步钥匙串。

> **兼容性说明：仅验证南京财经大学教务系统。** 其他高校、其他版本教务系统及自行修改的接口均未经过验证，不保证兼容。
>
> 本项目为非官方开源工具，与NUFE无隶属关系。学校接口、身份验证方式及 iOS 后台调度的变化，都可能影响同步。

## 用户指南

### 1. 安装

1. 在 iPhone 安装并打开 [Scripting](https://scriptingapp.github.io/)，点击右上角「＋」，选择「导入远程脚本」。

   <a href="docs/images/scripting-import-menu.webp"><img src="docs/images/scripting-import-menu.webp" alt="Scripting 导入远程脚本入口" width="330"></a>

2. 粘贴以下 **稳定版 Release ZIP** 地址并导入，**不要使用 GitHub 仓库源码 ZIP**。

   ```text
   https://github.com/b7f2d/NUFE-Schedule/releases/download/stable/NUFE-Schedule.zip
   ```

   <a href="docs/images/scripting-remote-zip.webp"><img src="docs/images/scripting-remote-zip.webp" alt="输入远程 ZIP 下载地址" width="330"></a>

3. 返回 Scripting 主界面，点击 **CourseSync 项目卡片**运行。

   <a href="docs/images/scripting-project-card.webp"><img src="docs/images/scripting-project-card.webp" alt="点击 NUFE-Schedule 项目卡片" width="330"></a>

### 2. 首次同步

首次运行时，按提示授权日历访问，并创建或选择用于课表的独立日历。建议使用 iCloud 日历；以后即使在 Apple 日历中修改名称，项目仍按日历 ID 识别。

按提示在原生界面输入学校账号、密码及必要的验证码。**只有学校确认登录成功后**，程序才会保存自动登录凭据。同步完成后，打开 Apple 日历核对课程日期、时段和教室。

后续运行时，从主菜单选择「立即刷新」即可重新获取并同步学校课表。首次同步涉及多个学期，可能比日常刷新更久。

> 请勿在专用课表日历里添加私人日程。项目只维护已绑定的日历；如果原日历不可用，不会在后台自行切换到其他同名日历。

### 3. 主屏幕小组件

1. 成功同步至少一次后，在主屏幕长按空白处，添加 **Scripting** 小组件。
2. 长按小组件 →「编辑小组件」→ 将脚本设为 **CourseSync**。

中、大尺寸固定显示 **昨天、今天、明天**，使用纯白背景与彩色课程卡片：

- **今天一节可见课程**：三天等宽，今天的课程字体更大。
- **今天有多节课程**：左侧仅显示正在上课或即将开始的一节，右侧显示之后尚未开始的课；大组件依次展开后续课程，中组件空间不足时标记「+N节课」。
- **课程状态**：已结束为灰色，正在上课为亮蓝色，尚未开始为浅蓝色。卡片保留课程名称、时间、教室和教师。

小尺寸重点显示今天的课程。小组件只读取本地已同步数据，**不会自行登录学校或修改日历**。课程切换时会申请更新，但实际刷新时间由 iOS 决定。

### 4. 定时刷新

1. 打开「快捷指令」→「自动化」，创建个人自动化并设置触发时间。
2. 添加 Scripting 的运行脚本操作，选择 CourseSync，设置为「立即运行」。
3. 保存后手动测试一次。

<a href="docs/images/shortcuts-automation.webp"><img src="docs/images/shortcuts-automation.webp" alt="通过快捷指令定时运行 NUFE-Schedule" width="330"></a>

后台自动化不会弹出输入窗口；如果学校要求手动验证，需在 Scripting 前台完成。iOS 也可能延迟或跳过部分后台任务。

### 5. 日常操作与更新

- **立即刷新**：同步课程，显示原生进度和最终结果。
- **运行状态**：查看最近同步结果，并在出现问题时使用环境自检。
- **教务接口**：通过 iOS 原生输入页面编辑统一认证、SSO 登录、课表页面、学期详情、课表数据五个地址，支持恢复默认。仅允许使用南京财经大学现有的可信 HTTPS 域名；模板里的 `{sid}` 为学期 ID，不得删除。配置存储在本机，不会写入日历。
- **退出登录**（已登录时显示）：清除本机学校 Cookie 和 CourseSync 保存的自动登录凭据，**保留课表及 Apple 日历**。下次点击「立即刷新」会重新登录；iOS「密码」App 中原有的学校网站密码不受影响。

**更新项目**：在 Scripting 主界面点击 CourseSync 卡片右上角「···」→「远程资源」→「立即更新」，不需要重新导入项目或创建日历。

> 为保护已有安装，底层脚本标识、GitHub 仓库地址及稳定版 ZIP 名称继续使用 `NUFE-Schedule`。Scripting、快捷指令或小组件若仍显示旧名称，继续使用原项目即可；如更新后组件或自动化无法找到脚本，请重新选择现有脚本，**不要删除原课表日历或重新导入一份重复项目**。

<a href="docs/images/scripting-refresh-menu.webp"><img src="docs/images/scripting-refresh-menu.webp" alt="在远程资源页面手动更新项目" width="330"></a>

遇到小组件内容未更新、会话过期或同步异常时，先检查项目是否为最新版本，再打开「运行状态」查看诊断信息。反馈问题时请提供错误代码和脱敏截图，**不要公开学号、密码或 Cookie**。
