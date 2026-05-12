const menuData = [
  {
    id: "home",
    title: "首页"
  },
  {
    id: "beam",
    title: "Beam",
    children: [
      { id: "beam-overview", title: "Beam.1 总览" },
      { id: "beam-gauss", title: "Beam.2 高斯拟合" },
      { id: "beam-map", title: "Beam.3 数据映射" }
    ]
  },
  {
    id: "aa",
    title: "AA",
    children: [
      { id: "aa-overview", title: "AA.1 总览" },
      { id: "aa-issues", title: "AA.2 Common Issues" },
      { id: "aa-notes", title: "AA.3 维修笔记" }
    ]
  },
  {
    id: "tools",
    title: "工具",
    children: [
      { id: "tool-tc-shift", title: "Scanning Magnet Shift" }
    ]
  }
];

const pageContent = {
  home: {
    hero: {
      tag: "Welcome",
      title: "Mevion Webtool",
      desc: "这是你的静态工具站骨架。左侧菜单可展开，点击不同条目时，中间主内容和右侧附带内容会切换。后面你只需要继续往数据里填真实内容。"
    },
    sections: [
      {
        title: "当前状态",
        type: "text",
        content: "这版已经具备固定背景、毛玻璃容器、三列布局、菜单展开、高亮当前项，以及动态内容切换。适合继续往里长真正的工具和笔记。"
      },
      {
        title: "新功能",
        type: "toolLinks",
        items: [
          {
            label: "Scanning Magnet Shift 计算器",
            desc: "TCLogger layer shift 提取、统计、offset 计算与绘图",
            pageId: "tool-tc-shift",
            icon: ""
          }
        ]
      },
      {
        title: "可放的内容",
        type: "grid",
        items: [
          { label: "功能 1", value: "Beam 工具入口" },
          { label: "功能 2", value: "AA 文档整理" },
          { label: "功能 3", value: "日志分析" }
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
      tag: "Tools",
      title: "工具页",
      desc: "以后你可把所有小工具统一放这里。"
    },
    sections: [
      {
        title: "预留",
        type: "grid",
        items: [
          { label: "Regex 小工具", value: "待制作" },
          { label: "日志过滤", value: "待制作" },
          { label: "参数换算", value: "待制作" }
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
  }
};