# Mevion Webtool 交接说明

更新日期：2026-08-31  
项目目录：`C:\Ddrive\Code\Mevion_Webtool`  
当前版本：`v2.1.4`  
当前分支：`main`  
当前状态：本轮稳定性修复尚未提交 Git；`npm run check` 通过（114/114 tests）。

## 基础维护 v2.1.2（2026-08-31）

- 修复 TIC 温压、SM Layer Shift、Patient Counter 对无表头 rollover 日志的整份漏读；保留首条数据，兼容带表头、列重排、BOM 与流式读取。
- 三个工具遇到不符合 TCLogger 格式的 CSV 会明确报错，不再静默给出零结果。
- 六个工具均阻止旧分析更新新任务的结果、进度或错误提示；四个 TC Logs 工具还检查共享文件是否已被其他工具替换。
- 新增 44 项回归测试，共 92 项通过；更新首页版本信息、脚本缓存版本及 v2.1.2 离线包。
- 验证边界：使用合成日志与受控异步测试，未回放真实现场日志；Browser 的 URL 安全策略阻止 file:// 导航，本轮未完成实际浏览器全流程验证。
- 本轮没有新增 gTwist 规则，也没有改动原有错误事件识别和图表计算公式。下方 gTwist 是上次留下的需求记录，不代表用户此次已要求继续实现。

## Kuka 合并优化 v2.1.3（2026-08-31）

- 用户提供当天两份 rollover 日志并指出 Kuka 的四行应按一个锁存周期统计。
- 改为按状态顺序合并：优先 LATCHED → UN-LATCHED，中途 satisfied/unsatisfied 不拆分；跨文件、超过十分钟和仅有锁存边界均可配对。同时间戳的解除并立即重新锁存仍视为一次未成功恢复。
- 两个完整锁存周期保持独立；无锁存边界时保留 unsatisfied/satisfied 回退；再次掉线后不再用之前的 satisfied 作为结束时间。
- 真实日志回放：事件 12 → 9；Kuka 合并为 17:38:09.664–17:39:53.914 一条，其余 8 条事件逐字段对比不变。
- CIG Collision 原规则未改：Nozzle Collision Detected 与同文件随后 1 秒内的 UNKNOWN_TERMINATION 配对。当天 5 条原始碰撞提示，其中 08:23:28.279、08:28:45.783 两条形成已识别事件；另外三条没有符合条件的配对，当前仅作支持证据，不独立展示。
- 验证：99 项测试通过；用户提供的 http://127.0.0.1:5500/index.html 可正常访问，已用合成 CSV 在实际浏览器确认一行 Kuka、正确时间范围及两条边界消息。两份真实日志在本机通过脚本回放，未复制入仓库。
- 已更新 v2.1.3 首页、缓存版本及离线包；gTwist 仍未实现。

## HALO 与 Patient Counter v2.1.4（2026-08-31）

- 四个 TC Logs 工具支持 HALO 的 TC Datetime 列；不使用 MCC Datetime 替代本地 TC 时间。Error Analyzer 合并 Extra Text 与 Code Line 以保留来源行号。
- 共用 CSV 逻辑记录读取器支持多行 message、引号转义与跨流式数据块读取。Patient Counter 仅收集候选消息，跨文件按 TC 时间排序后解析病人上下文；剂量文件路径中的明确 ID 优先于旧上下文，非数字 ID 不继续污染上一病人的射野。
- Error Analyzer 日志范围取实际记录最小/最大 TC 时间，排除设备未初始化时的 1970-01-01 占位时间；不把多行 message 中的文本当成额外记录。
- Patient Counter 起止时间合并为一列；跨日保留日期，悬停显示完整时间。在射野右侧增加治疗野数：不同原始 Beam >= 2 去重计数，排除原始 Beam 1（Setup）；没有射野显示 -，仅 Setup 显示 0。
- 下一页右侧增加「提取逻辑」按钮；居中 dialog 对照实际 message 解释 ID、Fraction、NEW、起止时间、耗时、射野、治疗野数、来源及限制，支持关闭、Esc 与背景关闭。
- 本次提供的 HALO 文件共 122609 条，含 2884 条多行 message、691 处时间逆序，范围 00:04–13:09；解析 15 人、2 个 Frac 1、3 个报错事件。两份原始日志仍为 26 人、4 个 Frac 1、9 个报错事件；26 人的已有次数、起止时间、耗时、来源均与原逻辑逐项一致。
- HALO 与转换为常规列名并按时间排序后的等价输入对照，四工具数据结果一致（忽略 SM Layer Shift 随机 UI rowId）。114 项自动测试通过；浏览器合成 HALO 样例验证 31 人分页、时间合并、Setup 计数与弹窗布局/关闭，无控制台错误。
- 重要限制：人数包括仅打开计划的数字 ID；NEW 仅代表记录出现 Frac 1。射野数为日志中观察到的不同野，不是计划总野数或完成照射证明。耗时为每个 ID/Fraction 的活动时间区间求和，包含等待、中断和 Setup。跨日期同编号 Fraction 仍合并。
- 已更新 v2.1.4 离线包，原始日志不进入仓库。gTwist 仍未实现。

## 1. 项目用途

这是给现场工程师使用的内部离线网页工具，主要分析 TCLogger 和 Daily Treatment Record。

- 纯前端静态网页，不需要服务器。
- 数据只在浏览器本机处理，不上传、不留存。
- `index.html` 是主入口；同事可直接双击 `双击打开工具.html`。
- 离线分发包：`downloads/TJH_Tool_v2.1.4_解压后使用.zip`。
- 工具是辅助分析用途，正式判断仍以公司系统、文档和流程为准。

## 2. 当前已有工具

### TC Logs

- **Error Analyzer**：整理 TC Log 报错、异常终止和相关上下文。
- **SM Layer Shift**：Layer Shift、Offset 计算与可视化。
- **Patient Counter**：查看当天已治疗人数。
- **TIC Temp & Pressure**：绘制 TICs 温度、气压趋势。

### Daily

- **TIC Sweep Analyzer**：TIC Sweep 可视化分析。
- **No Scanning Analyzer**：按天汇总 No Scanning Treatment Record，绘制 Position 与 Sigma 趋势。

首页还包含 Bomgar 路径、Notepad++ 搜索词和复制按钮。

## 3. 代码位置

- `index.html`：页面入口、CSS/JS 引用和下载链接。
- `data/pages.js`：菜单、首页文字和各工具页面定义。
- `data/interlocks.js`：37022R13 联锁名称及 SAF19-JA4 描述。
- `js/page-modules/error-analyzer-tool.js`：Error Analyzer 的主要识别、合并、折叠和渲染逻辑。
- `js/page-modules/no-scanning-tool.js`：No Scanning 解析、平均值和图表。
- `js/csv-utils.js`：共用 CSV 解析逻辑。
- `css/tool-*.css`：各工具样式。
- `tests/error-analyzer.test.mjs`：Error Analyzer 回归测试。
- `tests/no-scanning.test.mjs`：No Scanning 回归测试。
- `tools/replay-error-analyzer.mjs`：用真实日志回放 Error Analyzer。
- `tools/build-offline-zip.ps1`：重建离线压缩包。

## 4. Error Analyzer 当前能力

目前已完成的重点包括：

- 批量读取大量 TCLogger 文件，支持带表头及 rollover 无表头文件。
- 未归纳的 `ERROR-xxxx` 会使用原始错误码显示。
- Clinical / Warning / Service 分类、Type 精确筛选和统计弹窗。
- 结合上下文合并同一事件，并显示时间范围。
- 剂量类事件区分 `DOS X`、`DOS Y` 或两者。
- 已处理 dPos、dCompare、dCharge、dSize、dShift、dTime、Range Shifter CV、AA position 等。
- Beam key、SM Cooling、TIC Temp、TIC Pressure、Heap Free 等连续重复信息可折叠计数。
- Kuka Offline 可用 LATCHED / UN-LATCHED，也可用 UNSATISFIED / SATISFIED 补齐边界。
- Range Shifter 多板 CV fail 和 plate motor fault 可合并。
- 关键数值会加粗。

相关逻辑已经比较复杂。新增规则时应优先复用现有的“候选筛选 → 识别 → 合并/折叠 → 渲染”流程，并补回归测试，避免只在 UI 层临时修补。

## 5. 当前尚未完成：gTwist

上次（2026-07-24）提出的需求仍未写入代码：

> 检查 2026-07-24 11:43 前后的 gTwist，并把这一事件显示在 Error Analyzer。

日志文件：

- `D:\Log\TCLogger.csv`
- `D:\Log\TONGJI-S250i-0013-TCLogger.2026-07-24_11-41-58.csv`

已经查到的时间线：

1. 真正触发发生在 **11:36:10**，不是 11:43：
   - `GO: Ctrl: Twist Exceeded. -6.2459.`
   - `IL_GANTRY_TWIST became LATCHED. (Type 2)`
   - `PERMIT_BEAM_PREP ... NOT PERMITTED due to IL_GANTRY_TWIST becoming UNSATISFIED.`
   - `PERMIT_DOWN_WARMUP ... NOT PERMITTED due to IL_GANTRY_TWIST becoming UNSATISFIED.`
2. **11:43:19** 左右执行 Gantry Outer reset，随后设备短暂 OFFLINE / ONLINE。
3. **11:43:44.957**：
   - `IL_GANTRY_TWIST became UN-LATCHED`

初步判断：这是一个跨两个 rollover 文件的事件。11:43 更像重置及恢复时间，不是新的 gTwist 触发。

建议在 Error Analyzer 中合并为一条 Warning：

- Type：`gTwist`
- Notes：`Gantry twist`
- 时间：`11:36:10.809` 至 `11:43:44.957`
- 默认展示三条核心信息：
  1. Twist Exceeded 数值
  2. IL_GANTRY_TWIST LATCHED
  3. IL_GANTRY_TWIST UN-LATCHED

Outer Gantry reset、OFFLINE、ONLINE 可作为分析依据，但不一定需要全部塞入默认 Message Text。实现前应再次核对真实日志和 `data/interlocks.js`。

## 6. 如继续 gTwist，建议的操作顺序

1. 先读本文件，但不要完全依赖交接结论，仍需检查真实代码和日志。
2. 在 `error-analyzer-tool.js` 中搜索现有 Kuka、TIC、RS fault 的跨行/跨文件合并模式。
3. 将 `Twist Exceeded` 和 `IL_GANTRY_TWIST` 加入快速候选筛选及识别逻辑。
4. 合并 LATCHED 与 UN-LATCHED，确保可以跨两个日志文件。
5. 在 `tests/error-analyzer.test.mjs` 添加跨文件 gTwist 回归测试。
6. 用两份真实日志回放，确认只生成一条 gTwist 事件。
7. 执行：

```powershell
npm run check
npm run build:zip
```

8. 如修改了 JS/CSS 引用，记得更新 `index.html` 中对应的 `?v=` 缓存版本。

## 7. 开发注意事项

- 所有文件按 UTF-8 保存。旧版 Windows PowerShell 控制台有时会把中文显示成乱码，不代表源文件损坏；不要用可能改变编码的 shell 写文件。
- 本项目已经有自动测试，新增识别规则必须避免破坏旧日志结果。
- 用户偏好直接、清楚、紧凑的 UI；图表通常参考 MATLAB/Excel 风格。
- 用户会提供真实日志和截图进行逐步迭代，目前没有已知的大型恶性 bug。
- 修改完成后应同时重建离线 zip，否则下载包不会包含最新代码。
