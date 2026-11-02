# NUFE-Schedule

## 项目介绍

**NUFE-Schedule** 是面向 NUFE 学生的 iPhone 课表同步工具。项目通过学校官方认证与教务接口读取课程数据，并借助 [Scripting](https://scriptingapp.github.io/) 和 iOS「快捷指令」将课程同步至 Apple 日历，无需自行部署服务器或保持电脑在线。

- **自动维护课表**：支持多个学期，识别课程新增、调整和取消，保留必要的本地备份与同步记录。
- **清晰的日历信息**：标题显示课程名及教师姓名，地点显示教室或教学楼，备注仅显示最近一次成功同步时间。
- **本地处理登录信息**：学校认证请求由设备直接发起；账号密码可由用户选择保存至支持 iCloud 同步的系统钥匙串，Cookie 则保存在本机。
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

1. 建议在 Apple 日历中建立独立、可编辑的「课表」日历（优先使用 iCloud）。如果尚未创建，也可在首次前台运行时按提示自动创建：程序先尝试 CalDAV 账户，失败后再尝试本机日历。**请勿混放私人日程**，以免课程同步清理时被删除。
2. 在 Scripting 主界面点击 NUFE-Schedule 项目，按照提示授权日历访问，并选择「课表」日历。
3. 输入学校账号和密码完成认证。需要在 Cookie 失效后自动登录时，可勾选保存到 iCloud 钥匙串。
4. 点击「立即刷新」，然后在 Apple 日历中核对课程时间、教师姓名和地点。首次同步历史学期时，建议同时核对第一教学周的日期。

### 三、设置自动同步

1. 打开 iOS「快捷指令」，进入「自动化」，创建个人自动化，选择「日出」或其他需要的时间触发条件，并设置为「立即运行」。
2. 添加 Scripting 的「使用参数、文本、链接运行」操作，选择 NUFE-Schedule，不必填写图片、文件或额外参数。
3. 可按需关闭该操作的「运行时显示」「运行时打开」以及自动化通知，以减少执行时的界面干扰。
4. 保存后先手动执行一次，确认能够正常同步。

   <a href="docs/images/shortcuts-automation.webp"><img src="docs/images/shortcuts-automation.webp" alt="快捷指令示例：每天日出自动执行 NUFE-Schedule" width="330"></a>

> 定时同步受 iOS 后台运行条件约束，不能保证每次都在指定时刻完成。遇到验证码或二次认证时，需要打开 Scripting 手动处理。

### 四、日常使用与更新

在 Scripting 主界面点击 NUFE-Schedule，可使用「立即刷新」「账号与日历设置」和「运行状态」。设置中仅保留「自动登录凭据」与「课表日历」两项；清理异常 Cookie、导出恢复备份等操作只会在对应故障出现时提供入口。

如果手动刷新时已有任务在运行，可以选择等待完成，或请求前一任务安全退出后再开始。本项目不会强制终止正在执行的 iOS 进程。

如需手动更新已导入的远程项目：

1. 在 Scripting 主界面找到 NUFE-Schedule，点击项目卡片右上角的「···」菜单。
2. 选择「刷新脚本」，由 Scripting 重新获取项目的远程资源。
3. 更新完成后，点击 NUFE-Schedule 打开项目，并选择「立即刷新」检查课表同步是否正常。

   <a href="docs/images/scripting-refresh-menu.webp"><img src="docs/images/scripting-refresh-menu.webp" alt="Scripting 项目菜单中的「刷新脚本」选项" width="330"></a>

远程资源仍使用上方的固定安装地址。更新时请保留现有项目与「课表」日历，避免重复导入或丢失原有配置。涉及账号、日历或后台权限的异常，可在「运行状态」中查看提示。
