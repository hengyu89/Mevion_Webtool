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
      { id: "tool-tc-shift", title: "Scanning Magnet Shift" },
      { id: "tool-patient-counter", title: "Patient Counter" },
      { id: "tool-tic-monitor", title: "TIC Monitor" }
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
      tag: "Welcome",
      title: "On-site Tools",
      desc: "该网站的初衷为集成各个便利的分析工具，提高现场分析数据效率。注意所有工具仅用于分析，因其并非官方工具，所以数据结果禁止作为现象证据。另外该网页仅有工具，没有保存任何敏感数据，已保存内容仅会保存于您的本地电脑，可放心使用。"
    },
    sections: [
      {
        title: "更新内容 v2.0.1 —— 2026/7/1",
        type: "text",
        content: "1. 更新 TC Logs 三个工具的部分 UI，更新病人计数器的算法方式；<br>2. 新添工具 TIC Sweep Analyzer，感谢陈龙！龙哥是超人！"
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
                desc: "筛选并整理 TC Log 报错信息",
                pageId: "tool-error-analyzer"
              },
              {
                label: "Scanning Magnet Shift",
                desc: "Layer Shift、Offset 与趋势图",
                pageId: "tool-tc-shift"
              },
              {
                label: "Patient Counter",
                desc: "治疗人数、Frac 与射野统计",
                pageId: "tool-patient-counter"
              },
              {
                label: "TIC Temp / Pressure",
                desc: "TIC 温度与气压趋势",
                pageId: "tool-tic-monitor"
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
                    desc: "Pulses、Channels 与 dCompare",
                    pageId: "daily-tic-sweep"
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
            value: "ERROR-(?!4065\\b|4060\\b|46034\\b|26016\\b)\\d+"
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
            desc: "筛选并整理 TC Log 报错信息",
            pageId: "tool-error-analyzer"
          },
          {
            label: "Scanning Magnet Shift 计算器",
            desc: "Layer Shift 提取、offset 计算、绘图",
            pageId: "tool-tc-shift"
          },
          {
            label: "病人计数器",
            desc: "计算已治疗人数",
            pageId: "tool-patient-counter"
          },
          {
            label: "TIC 温度/气压",
            desc: "绘图 TIC Temp / Pressure 与时间关系",
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
            desc: "绘制 pulses, channels, dCompare 分析图",
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
            desc: "绘制 pulses, channels, dCompare 分析图",
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
      title: "Scanning Magnet Shift 计算器",
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
      title: "病人计数器",
      desc: "计算已治疗人数。"
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
      title: "TIC 温度/气压",
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
