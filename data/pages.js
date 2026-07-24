const menuData = [
  {
    id: "home",
    title: "首页"
  },
  {
    id: "tools",
    title: "TC Logger",
    children: [
      { id: "tool-error-analyzer", title: "Error Analyzer" },
      { id: "tool-tc-shift", title: "SM Layer Shift" },
      { id: "tool-patient-counter", title: "Patient Counter" },
      { id: "tool-tic-monitor", title: "TIC Temp & Pressure" }
    ]
  },
  {
    id: "daily-beam",
    title: "Daily Beam",
    children: [
      { id: "daily-tic-sweep", title: "TIC Sweep Analyzer" }
    ]
  }
];

const pageContent = {
  home: {
    hero: {
      tag: "",
      title: "Service Analysis Toolkit",
      desc: "内部辅助工具，用于现场分析与日常参考。分析结果请以正式系统和流程为准；数据仅在本机处理，不会上传或留存。"
    },
    sections: [
      {
        title: "更新内容 v.2.1.1 — 2026/7/24",
        type: "text",
        content:
          "1. 首页 UI 更新；<br>2. 在<strong>首页</strong>添加 Bomgar 和 Notepad++ 的常用搜索关键词，按<strong>右侧复制图标</strong>可快捷复制；<br>3. 添加常用工具 Error Analyzer，可筛选绝大多数 TC Logs 报错（如 Heap Free、Kuka Offline 等）。",
        history: [
          {
            version: "v2.0.1",
            date: "2026/7/1",
            content:
              "1. 更新 TC Logs 三个工具的部分 UI，更新病人计数器的算法方式；<br>2. 新添工具 TIC Sweep Analyzer，感谢陈龙！龙哥是超人！"
          }
        ]
      },
      {
        title: "常用工具",
        type: "toolDirectory",
        columns: [
          {
            title: "TC Logs",
            items: [
              {
                label: "Error Analyzer",
                desc: "整理 TC Log 报错信息",
                pageId: "tool-error-analyzer",
                icon: "!",
                tone: "alert"
              },
              {
                label: "SM Layer Shift",
                desc: "Layer Shift、Offset 计算与可视化",
                pageId: "tool-tc-shift",
                icon: "↔",
                tone: "motion"
              },
              {
                label: "Patient Counter",
                desc: "查看今日已治疗人数",
                pageId: "tool-patient-counter",
                icon: "#",
                tone: "patient"
              },
              {
                label: "TIC Temp & Pressure",
                desc: "TICs 温度与气压趋势",
                pageId: "tool-tic-monitor",
                icon: "°C",
                tone: "environment"
              }
            ]
          },
          {
            title: "Daily",
            groups: [
              {
                title: "TIC Sweep",
                items: [
                  {
                    label: "TIC Sweep Analyzer",
                    desc: "TIC Sweep 可视化分析",
                    pageId: "daily-tic-sweep",
                    icon: "∿",
                    tone: "daily"
                  }
                ]
              }
            ]
          },
          {
            title: "杂项",
            items: []
          }
        ]
      },
      {
        title: "Bomgar 路径",
        type: "copyList",
        items: [
          {
            label: "新 TC Logs",
            value: "/opt/mevion/apps/2.9.1R5_PRODUCTION/logs/"
          },
          {
            label: "旧 TC Logs",
            value: "/backup_logs/MAIN/"
          },
          {
            label: "Daily Data",
            value: "/home/mevion/Desktop/daily test/"
          },
          {
            label: "Vacuum data",
            value: "/backup_logs/TMUX/"
          }
        ]
      },
      {
        title: "Notepad++ 常用关键词",
        type: "copyList",
        items: [
          {
            label: "异常治疗中断",
            value: "abnormal termination"
          },
          {
            label: "Error- 类报错（需开正则表达式）",
            value: "ERROR-(?!4065\\b|4060\\b|46034\\b|26016\\b|26015\\b)\\d+"
          },
          {
            label: "Left OG Disabled",
            value: "MOTION_ERROR_GALIL_INVALID_BG_WHILE_DISABLED"
          },
          {
            label: "mACP 不满足",
            value: "mACP: Faulted"
          }
        ]
      }
    ],
    side: []
  },

  tools: {
    hero: {
      tag: "",
      title: "TC Logger 相关工具",
      desc: "该菜单包含仅上传 TC Logger 即可生成数据的工具。"
    },
    sections: [
      {
        title: "常用工具",
        type: "toolLinks",
        items: [
          {
            label: "Error Analyzer",
            desc: "整理 TC Log 报错信息",
            pageId: "tool-error-analyzer"
          },
          {
            label: "SM Layer Shift",
            desc: "Layer Shift、Offset 计算与可视化",
            pageId: "tool-tc-shift"
          },
          {
            label: "Patient Counter",
            desc: "查看今日已治疗人数",
            pageId: "tool-patient-counter"
          },
          {
            label: "TIC Temp & Pressure",
            desc: "TICs 温度与气压趋势",
            pageId: "tool-tic-monitor"
          }
        ]
      }
    ],
    side: []
  },

  "daily-beam": {
    hero: {
      tag: "",
      title: "Daily Beam Analyzer",
      desc: "该菜单包含每日数据、周报分析相关工具。"
    },
    sections: [
      {
        title: "新功能",
        type: "toolLinks",
        items: [
          {
            label: "TIC Sweep Analyzer",
            desc: "TIC Sweep 可视化分析",
            pageId: "daily-tic-sweep"
          }
        ]
      },
      {
        title: "常用工具",
        type: "toolLinks",
        items: [
          {
            label: "TIC Sweep Analyzer",
            desc: "TIC Sweep 可视化分析",
            pageId: "daily-tic-sweep"
          }
        ]
      }
    ],
    side: []
  },

  "daily-tic-sweep": {
    hero: {
      tag: "",
      title: "TIC Sweep Analyzer",
      desc: "分析 TIC Sweep Treatment Record，查看单脉冲 TIC、累计 TIC 和位置相关指标。"
    },
    sections: [
      {
        title: "工具区",
        type: "custom",
        customId: "ticSweepToolRoot"
      }
    ],
    side: []
  },

  "tool-error-analyzer": {
    hero: {
      tag: "",
      title: "Error Analyzer",
      desc: "导入 TCLogger 文件，筛选并整理报错与异常中断信息。"
    },
    sections: [
      {
        title: "工具区",
        type: "custom",
        customId: "errorAnalyzerToolRoot"
      }
    ],
    side: []
  },

  "tool-tc-shift": {
    hero: {
      tag: "",
      title: "SM Layer Shift",
      desc: "拖入一个或多个 TCLogger 文件，自动提取 layer shift 数据并分析、计算、绘图。"
    },
    sections: [
      {
        title: "工具区",
        type: "custom",
        customId: "tcShiftToolRoot"
      }
    ],
    side: []
  },

  "tool-patient-counter": {
    hero: {
      tag: "",
      title: "Patient Counter",
      desc: "查看今日已治疗人数。"
    },
    sections: [
      {
        title: "工具区",
        type: "custom",
        customId: "patientCounterToolRoot"
      }
    ],
    side: []
  },

  "tool-tic-monitor": {
    hero: {
      tag: "",
      title: "TIC Temp & Pressure",
      desc: "导入 TCLogger 文件，提取 US TIC、DS TIC X、DS TIC Y 的温度和气压并绘图。"
    },
    sections: [
      {
        title: "工具区",
        type: "custom",
        customId: "ticMonitorToolRoot"
      }
    ],
    side: []
  }
};
