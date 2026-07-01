const menuData = [
  {
    id: "home",
    title: "首页"
  },
  {
    id: "tools",
    title: "TC Logger",
    children: [
      { id: "tool-tc-shift", title: "Scanning Magnet Shift" },
      { id: "tool-patient-counter", title: "Patient Counter" },
      { id: "tool-tic-monitor", title: "TIC Monitor" }
    ]
  },
  {
    id: "daily-beam",
    title: "Daily Beam",
    children: [
      { id: "daily-no-scanning", title: "No Scanning" },
      { id: "daily-tic-sweep", title: "TIC Sweep" }
    ]
  }
];

const pageContent = {
  home: {
    hero: {
      tag: "Welcome",
      title: "On-site Tools",
      desc: "该网站的初衷为集成各个便利的分析工具，提高现场分析数据效率。注意所有工具仅用于分析，因其并非是官方工具，所以数据结果禁止作为现象证据。另外该网页仅有工具，没有保存任何敏感数据，已保存内容仅会保存于您的本地电脑，可放心使用。"
    },
    sections: [
      {
        title: "更新内容",
        type: "text",
        content: "1. 已创建工具「Layer Shift 计算器」「病人计数器」和「TIC 温度/气压与时间关系图」；<br>2. 左侧下载图表可将全工具下载到您的电脑本地，方便任意时间离线使用；<br>3. TC Logger 菜单在一个工具页面上传文件后，切到其它工具页面时无需再上传，工具在切换到当前页面后会自动分析。"
      },
      {
        title: "新功能",
        type: "toolLinks",
        items: [
          {
            label: "Scanning Magnet Shift 计算器",
            desc: "Layer Shift 提取、offset 计算、绘图",
            pageId: "tool-tc-shift",
            icon: ""
          },
          {
            label: "病人计数器",
            desc: "计算已治疗人数",
            pageId: "tool-patient-counter",
            icon: ""
          },
          {
            label: "TIC 温度/气压",
            desc: "绘图 TIC Temp / Pressure 与时间关系",
            pageId: "tool-tic-monitor",
            icon: ""
          }
        ]
      },
      {
        title: "常用工具",
        type: "toolLinks",
        items: [
          {
            label: "Scanning Magnet Shift 计算器",
            desc: "Layer Shift 提取、offset 计算、绘图",
            pageId: "tool-tc-shift",
            icon: ""
          },
          {
            label: "病人计数器",
            desc: "计算已治疗人数",
            pageId: "tool-patient-counter",
            icon: ""
          },
          {
            label: "TIC 温度/气压",
            desc: "绘图 TIC Temp / Pressure 与时间关系",
            pageId: "tool-tic-monitor",
            icon: ""
          }
        ]
      }
    ],
    side: [
      {
        title: "说明",
        items: [
          "左侧菜单由 JS 自动生成。",
          "当前页高亮，父目录会自动展开。",
          "后面可继续改成真正 wiki/tool 站。"
        ]
      },
      {
        title: "下一步建议",
        items: [
          "先把你的真实栏目名换进去。",
          "再给每一页填主内容。",
          "最后再做更细的样式。"
        ]
      }
    ]
  },

  beam: {
    hero: {
      tag: "Beam",
      title: "Beam 模块",
      desc: "这是父级目录页。点击左侧子项后，可以继续进入更细的内容页面。"
    },
    sections: [
      {
        title: "模块说明",
        type: "text",
        content: "Beam 目录下可以放高斯拟合、mapping、阈值显示、可视化图表等内容。"
      }
    ],
    side: [
      {
        title: "附带内容",
        items: [
          "可放使用说明。",
          "可放最近更新。",
          "可放快捷入口。"
        ]
      }
    ]
  },

  "beam-overview": {
    hero: {
      tag: "Beam.1",
      title: "Beam 总览",
      desc: "这里以后可以作为 Beam 相关工具和说明的首页。"
    },
    sections: [
      {
        title: "页面用途",
        type: "text",
        content: "可作为总入口，放几个大按钮：高斯拟合、趋势查看、阈值着色、日志分析。"
      },
      {
        title: "模块预留",
        type: "grid",
        items: [
          { label: "高斯拟合", value: "待制作" },
          { label: "热图/映射", value: "待制作" },
          { label: "阈值判断", value: "待制作" }
        ]
      }
    ],
    side: [
      {
        title: "备注",
        items: [
          "总览页适合放导航。",
          "不要一开始堆太多细节。",
          "先把入口结构整理好。"
        ]
      }
    ]
  },

  "beam-gauss": {
    hero: {
      tag: "Beam.2",
      title: "高斯拟合",
      desc: "这里未来可以接 Excel 上传、16+16 通道读取、拟合图显示和四参数输出。"
    },
    sections: [
      {
        title: "计划内容",
        type: "text",
        content: "后续这里可加入文件上传按钮、读取数据、拟合计算结果、以及图形显示区域。"
      },
      {
        title: "当前占位",
        type: "grid",
        items: [
          { label: "输入", value: "Excel 文件" },
          { label: "输出", value: "Position / Sigma" },
          { label: "图像", value: "拟合曲线" }
        ]
      }
    ],
    side: [
      {
        title: "更新",
        items: [
          "这页是未来最重要的页面之一。",
          "建议先把版面固定，再接算法。",
          "先静态，后动态。"
        ]
      }
    ]
  },

  "beam-map": {
    hero: {
      tag: "Beam.3",
      title: "数据映射",
      desc: "这里可放你之前那种块状矩阵映射、阈值着色、ACP8/Fast TP 等视图。"
    },
    sections: [
      {
        title: "页面用途",
        type: "text",
        content: "适合放 2x2 或 2x3 小块矩阵、LHP/RHP 坐标、条件着色与概览。"
      }
    ],
    side: [
      {
        title: "右栏可放",
        items: [
          "阈值说明",
          "颜色图例",
          "最近一次导入信息"
        ]
      }
    ]
  },

  aa: {
    hero: {
      tag: "AA",
      title: "Adaptive Aperture",
      desc: "AA 父级目录页。可继续展开常见故障、结构说明、维修经验。"
    },
    sections: [
      {
        title: "目录说明",
        type: "text",
        content: "这里适合整理 AA 常见问题、ball screw、flexure、bank、次级反馈等内容。"
      }
    ],
    side: [
      {
        title: "备注",
        items: [
          "你后面可把看文档后的总结持续堆进来。",
          "也可单独做成图文说明页。"
        ]
      }
    ]
  },

  "aa-overview": {
    hero: {
      tag: "AA.1",
      title: "AA 总览",
      desc: "放 AA 模块简介、结构图、维修思路总入口。"
    },
    sections: [
      {
        title: "用途",
        type: "text",
        content: "可以作为 AA 相关知识的首页。"
      }
    ],
    side: [
      {
        title: "附带",
        items: [
          "术语表",
          "零件表",
          "常见入口"
        ]
      }
    ]
  },

  "aa-issues": {
    hero: {
      tag: "AA.2",
      title: "Common Issues",
      desc: "可整理 flexure、ball screw、secondary feedback 等问题。"
    },
    sections: [
      {
        title: "整理方向",
        type: "text",
        content: "以后可逐条记录：症状、判断逻辑、优先检查项、更换建议。"
      },
      {
        title: "示例",
        type: "grid",
        items: [
          { label: "症状", value: "空转 / 打滑" },
          { label: "优先检查", value: "Flexure" },
          { label: "升级判断", value: "Ball screw 是否异常" }
        ]
      }
    ],
    side: [
      {
        title: "侧边说明",
        items: [
          "先记录现场经验。",
          "后面再整理成规范格式。",
          "别一开始追求完美。"
        ]
      }
    ]
  },

  "aa-notes": {
    hero: {
      tag: "AA.3",
      title: "维修笔记",
      desc: "可作为现场经验、文档要点、个人理解的汇总页。"
    },
    sections: [
      {
        title: "用途",
        type: "text",
        content: "这里适合堆你自己的实战笔记。"
      }
    ],
    side: [
      {
        title: "建议",
        items: [
          "按问题类型分段。",
          "多写判断条件。",
          "少写纯结论。"
        ]
      }
    ]
  },

  tools: {
    hero: {
      tag: "",
      title: "TC Logger 相关工具",
      desc: "该菜单包含了仅上传 TC Logger 即可生成数据的工具。"
    },
    sections: [
      {
        title: "常用工具",
        type: "toolLinks",
        items: [
          {
            label: "Scanning Magnet Shift 计算器",
            desc: "Layer Shift 提取、offset 计算、绘图",
            pageId: "tool-tc-shift",
            icon: ""
          },
          {
            label: "病人计数器",
            desc: "计算已治疗人数",
            pageId: "tool-patient-counter",
            icon: ""
          },
          {
            label: "TIC 温度/气压",
            desc: "绘图 TIC Temp / Pressure 与时间关系",
            pageId: "tool-tic-monitor",
            icon: ""
          }
        ]
      }
    ],
    side: [
      {
        title: "提醒",
        items: [
          "工具页适合卡片式入口。",
          "后面再逐个点进去。"
        ]
      }
    ]
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
            label: "No Scanning",
            desc: "预留：No Scanning 相关每日数据分析",
            pageId: "daily-no-scanning",
            icon: ""
          },
          {
            label: "TIC Sweep",
            desc: "预留：TIC Sweep 相关每日数据分析",
            pageId: "daily-tic-sweep",
            icon: ""
          }
        ]
      },
      {
        title: "常用工具",
        type: "toolLinks",
        items: [
          {
            label: "No Scanning",
            desc: "预留：No Scanning 相关每日数据分析",
            pageId: "daily-no-scanning",
            icon: ""
          },
          {
            label: "TIC Sweep",
            desc: "预留：TIC Sweep 相关每日数据分析",
            pageId: "daily-tic-sweep",
            icon: ""
          }
        ]
      }
    ],
    side: []
  },

  "daily-no-scanning": {
    hero: {
      tag: "",
      title: "No Scanning",
      desc: "No Scanning 相关每日数据分析工具预留页。"
    },
    sections: [
      {
        title: "工具区",
        type: "text",
        content: "该工具页面暂未接入具体分析逻辑。"
      }
    ],
    side: []
  },

  "daily-tic-sweep": {
    hero: {
      tag: "",
      title: "TIC Sweep",
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

  "tool-tc-shift": {
    hero: {
      tag: "",
      title: "Scanning Magnet Shift 计算器",
      desc: "拖入一个或多个 TCLogger 文件，自动提取 layer shift 数据并分析、计算、绘图"
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
      desc: "计算已治疗人数"
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
      desc: "导入 TCLogger 文件，提取 US TIC、DS TIC X、DS TIC Y 的温度和气压并绘图"
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
