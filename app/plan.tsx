'use client';
import { useState } from 'react';
import { staticMode } from './lib/model-client';
import { ArrowRight, Check, Layers, Target, Route, Database, Sparkles, Flag } from 'lucide-react';
const sections = ['产品定位', '页面与交互', '数据与 AI', '使用与成长'];
export default function Plan() {
 const [section, setSection] = useState(0);
 return <>
  <div className="page-heading"><div><div className="eyebrow">PRODUCT BLUEPRINT</div><h1>把想法，变成一份清晰的规划。</h1><p>成长证据簿 · 产品范围、核心流程与实现路线</p></div><span className="tag warm">使用规划</span></div>
  <div className="plan-banner"><div className="icon-tile"><Target size={26}/></div><div><h2>用事实记录贡献，用证据看见成长。</h2><p>一个面向个人的工作成长档案：30 秒记录碎片，先确认工作分组，再整理证据，阶段回顾时有据可查。</p></div></div>
  <div className="tabs">{sections.map((s,i)=><button key={s} className={section===i?'active':''} onClick={()=>setSection(i)}>{s}</button>)}</div>
  {section===0 && <div className="plan-grid">
   <section className="panel"><h2><Target size={19}/> 谁会使用它</h2><div className="persona"><b>知识工作者 / 项目贡献者</b><p>开发、产品、设计、运营等岗位。每天做了很多事，但到了述职时只能想起最近几件。</p></div><div className="persona"><b>正在转岗或成长中的新人</b><p>希望把“学过什么”变成“实际做过什么”，为岗位成长与面试积累具体故事。</p></div><div className="persona"><b>独立开发者 / 独立创作者</b><p>一个人同时承担多个角色，需要看清交付、用户反馈和个人贡献，逐步形成作品档案。</p></div></section>
   <section className="panel"><h2>要解决的 4 个问题</h2><ol className="number-list"><li><b>记不住</b><p>成果散落在聊天、文档和日常笔记里，容易遗忘。</p></li><li><b>说不清</b><p>“参加会议、完成需求”没有说明问题、行动与结果。</p></li><li><b>缺依据</b><p>总结里有数字和评价，却找不到对应的原始记录。</p></li><li><b>难回顾</b><p>阶段总结耗时，无法看清反复出现的贡献模式。</p></li></ol></section>
   <section className="panel wide"><h2>完整价值链</h2><div className="flow">{['工作碎片','工作分组确认','AI 证据草稿','本人审核入档','成长回顾'].map((s,i)=><div key={s}><span>{String(i+1).padStart(2,'0')}</span><b>{s}</b>{i<4&&<ArrowRight size={18}/>}</div>)}</div><p>每一份回顾都能回到证据卡，每张卡都能回到原始碎片。AI 提供整理建议，本人负责事实确认。</p></section>
   <section className="panel"><h2>产品成功指标</h2><ul className="check-list"><li><Check/>首次记录可在 30 秒内完成</li><li><Check/>每张确认卡的三个事实字段都有原文引用</li><li><Check/>新用户能独立完成“记录 → 整理 → 确认”</li><li><Check/>阶段回顾能定位到实际记录</li><li><Check/>用户愿意每周主动回顾一次</li></ul><p className="muted small">这些是产品验收目标，不是当前已达成的测量结果。</p></section>
   <section className="panel"><h2>使用习惯设计</h2><p><b>每天：</b>只写今天遇到的问题、自己做的事和目前看到的结果，允许不完整。</p><p><b>每周：</b>批量整理碎片，回答缺失信息，确认 2—3 张有价值的证据卡。</p><p><b>每月：</b>查看项目与能力标签分布，生成回顾，为下月选择一个需要积累证据的方向。</p><p><b>述职前：</b>按周期筛选已确认成果，导出带原文依据的素材。</p></section>
  </div>}
  {section===1 && <div className="plan-grid">
   <section className="panel wide"><h2><Layers size={19}/> 信息架构与页面职责</h2><table className="plan-table"><thead><tr><th>页面</th><th>核心任务</th><th>关键交互</th></tr></thead><tbody>{[
    ['成长总览','知道自己积累了什么，以及还差什么','记录／整理／审核任务、真实数量、最近工作足迹、备份提醒'],
    ['项目管理','让项目背景与个人贡献连起来','目标、个人职责、计划周期、状态与颜色、关联记录与证据、项目时间轴、有证据依据的里程碑、归档'],
    ['成长时间轴','看清不同时间段实际做了什么','月份概览、项目/日期/关键词筛选、顺序切换、事件归并、项目泳道、里程碑、原始记录与关联证据跳转'],
    ['工作任务','关联同一工作的连续记录','统一名称与主题标签、跨日期归组、已有任务关联、合并与拆分、历史原文和证据'],
    ['工作记录','低成本保存原始工作记录','文字录入、附件与截图、文档与本机 OCR 导入、日期/项目/类型、搜索筛选、批量 AI 整理、手动建卡'],
    ['证据卡片','把原始记录整理成可复用的贡献','贡献重点、关键行动、实际变化、星标与重点筛选、逐项引用、补充信息、编辑、确认或撤回确认'],
    ['成长回顾','将已确认事实编排成输出','周期与项目筛选、选择证据、三种输出结构、正文草稿、来源快照、Word/PDF/Markdown 导出'],
    ['使用帮助','理解工作流与产品机制','记录／核对／回顾的节奏、导入说明、数据机制与详细规划'],
    ['设置','自行连接模型与管理个人数据','昵称与头像、API 配置、配色与密度、本机保存位置、备份与恢复、回收站、加密同步、独立空间']
   ].map(row=><tr key={row[0]}>{row.map(v=><td key={v}>{v}</td>)}</tr>)}</tbody></table></section>
   <section className="panel"><h2><Route size={19}/> 记录与整理流程</h2><ol className="number-list"><li><b>保存原文</b><p>可以输入文字，或上传日志、周报、会议记录等文档；在逐条校对时设置日期、项目与分类。</p></li><li><b>选择碎片</b><p>选择相关碎片整理；文档会按段落和日期分段，长文自动分批处理并保留文件来源。</p></li><li><b>生成草稿</b><p>校验结构与引用后保存；重复整理有提示，原始记录保留。</p></li><li><b>补齐与审核</b><p>检查个人职责、结果和数字依据，编辑字段、采纳补充事实并逐字选取引用，记录反思与下一步验证。</p></li><li><b>确认入档</b><p>未解决的缺失项、没有引用的事实字段会阻止确认。</p></li></ol></section>
   <section className="panel"><h2>边界与异常交互</h2><ul className="detail-list"><li><b>没有 API：</b>仍能记录、手动建卡和生成事实回顾；整理入口引导设置。</li><li><b>请求失败：</b>保留已选碎片，显示认证、限流、超时或格式错误，允许重试。</li><li><b>原文已有引用：</b>作为事实快照保留，补充信息新增记录，避免证据静默失效。</li><li><b>结果尚未发生：</b>标记“结果待补充”，不把计划包装为成绩。</li><li><b>团队共同成果：</b>追问本人负责的范围，确认后再纳入个人档案。</li><li><b>空状态：</b>提供示例体验和清晰的首条记录入口。</li></ul></section>
   <section className="panel wide"><h2>一张好的证据卡应该是什么样</h2><div className="example-card"><div><span className="tag green">事实结构</span><h3>优化筛选列表的重复查询</h3><p><b>问题：</b>客户反馈筛选列表加载慢。</p><p><b>行动：</b>通过性能分析定位重复查询，合并筛选请求。</p><p><b>结果：</b>相同测试环境下，加载时间从 2.4 秒降至 0.8 秒。</p></div><div><span className="tag">引用与边界</span><p>每个字段都关联原文记录。数字保持原单位与测试条件。</p><p>“工程实践”“问题解决”作为可调整标签；记录数量说明实践分布，不等同于能力评级。</p><p className="small muted">此案例为说明功能的虚构示例。</p></div></div></section>
  </div>}
  {section===2 && <div className="plan-grid">
   <section className="panel wide"><h2><Database size={19}/> 数据模型</h2><table className="plan-table"><thead><tr><th>实体</th><th>核心字段</th><th>约束</th></tr></thead><tbody><tr><td>Project · 项目</td><td>名称、背景、目标、个人职责、计划周期、状态、颜色、里程碑</td><td>名称唯一；更名同步更新关联记录；归档保留原文与证据</td></tr><tr><td>Fragment · 碎片</td><td>ID、日期、项目、分类、原文、文件来源、附件、参考链接、创建时间</td><td>原文长度 ≤ 6,000 字；被引用后保留快照</td></tr><tr><td>Evidence · 证据卡</td><td>标题、模板、背景、行动、结果、职责／条件、反思／复用／下一步、重点、标签、缺失项、引用</td><td>草稿 / 已确认；编辑后需要重新确认</td></tr><tr><td>Citation · 引用</td><td>碎片 ID、原文摘录、对应事实字段</td><td>逐字匹配原文；问题、行动和结果分别引用</td></tr><tr><td>Review · 回顾</td><td>周期、用途、正文、所选卡片 ID、证据与原文快照、创建时间</td><td>生成时只选择已确认卡片，保存一份可编辑快照</td></tr><tr><td>API Config · 设置</td><td>Base URL、Model、API Key</td><td>地址、模型与密钥按本机用户保存；解锁后恢复，不进入工作记录备份或同步</td></tr></tbody></table></section>
   <section className="panel"><h2><Sparkles size={19}/> 大模型负责的部分</h2><ul className="detail-list"><li><b>抽取：</b>从自然语言中找出问题、个人行动和已有结果。</li><li><b>归并：</b>把同一件事的相关碎片合并成贡献故事。</li><li><b>标注：</b>建议能力标签，并明确缺失信息。</li><li><b>引用：</b>逐字摘录来源，为三个事实字段分别提供依据。</li></ul><p>输入是选中的碎片，输出是固定结构的 JSON。模型返回后，程序校验卡片结构与原文引用，再保存为草稿。</p></section>
   <section className="panel"><h2>系统与本人负责的部分</h2><ul className="detail-list"><li><b>系统：</b>计算真实数量、筛选周期、检查引用、管理状态和导出。</li><li><b>本人：</b>确认事实与个人贡献、补充来源、调整措辞和标签。</li><li><b>当前回顾：</b>按确认事实编排模板，保持数值和引用，不增加新的业绩。</li><li><b>后续完善：</b>可增加 AI 编排建议，但新增推断仍需确认。</li></ul></section>
   <section className="panel wide"><h2>API 配置与数据流</h2><div className="flow compact">{['设置填写 API','选定工作碎片',staticMode?'浏览器连接模型服务':'同源后端转发','模型结构化输出','引用校验与保存'].map((v,i)=><div key={v}><span>{i+1}</span><b>{v}</b>{i<4&&<ArrowRight size={17}/>}</div>)}</div><p>支持兼容 Chat Completions 的 HTTPS 服务。Base URL 可包含 /v1，系统追加 /chat/completions；也可填写完整接口地址。密钥只用于本次请求，不进入备份、日志或项目源码。{staticMode?"网页直接调用模型接口，服务商需要允许跨域访问。":""}只有点击测试或 AI 整理时才调用所填模型服务。</p><p>文档与附件先保存在本机档案库，再提取文字。TXT、MD、LOG、CSV、TSV、DOCX、PDF 与图片可导入；扫描页通过本机 OCR 识别。单文件不超过 10 MB，本次最多 5 份、60,000 字、80 条记录；逐条核对日期、项目与文字后保存。跨设备可使用 JSON 备份迁移，或主动启用端到端加密同步；服务端只保存加密内容。</p></section>
  </div>}
  {section===3 && <div className="plan-grid">
   <section className="panel wide"><h2><Flag size={19}/> 版本路线</h2><div className="roadmap"><div><span className="tag green">当前功能</span><h3>闭环优先</h3><p>完整记录／核对／回顾流程，项目档案与里程碑，日期／事件／泳道时间轴，文档与本机 OCR，AI／手动建卡，逐字段引用核对，三种回顾用途与多格式导出。</p></div><div><span className="tag green">当前功能</span><h3>长期保存与恢复</h3><p>浏览器档案库，记录／证据／项目／回顾草稿，导入中断恢复，多页面冲突保护，自动恢复点与回收站，完整附件备份，本机文件夹自动备份，可选加密同步。</p></div><div><span className="tag">长期方向</span><h3>长期成长档案</h3><p>经授权的工作平台导入、个人作品集与可控分享、基于真实证据的岗位能力对照。</p></div></div></section>
   <section className="panel"><h2>适合你的记录节奏</h2><ol className="number-list"><li><b>工作结束时，留下一个片段</b><p>记录今天的问题、行动和已有结果，也可以直接导入工作日志。</p></li><li><b>每周整理，补齐事实</b><p>把相关记录整理成证据卡，检查个人职责和数字依据。</p></li><li><b>每月回顾，发现实践模式</b><p>观察项目和能力标签分布，找出值得继续练习的方向。</p></li><li><b>重要节点，复用已有证据</b><p>为述职、转岗或面试整理材料，每项贡献都能查看原文。</p></li></ol></section>
   <section className="panel"><h2>记录与输出的保障</h2><ul className="check-list"><li><Check/>刷新后恢复碎片、卡片与回顾</li><li><Check/>新增、编辑、删除与筛选结果一致</li><li><Check/>API 未配置、认证错误、超时都有明确反馈</li><li><Check/>不存在的来源和虚构摘录不会入档</li><li><Check/>缺失结果与引用时不能确认</li><li><Check/>回顾只纳入已确认且在周期内的卡片</li><li><Check/>备份不包含密钥，可完整导入恢复</li><li><Check/>手机上可录入与查看来源</li></ul></section>
   <section className="panel wide"><h2>从工作记录到成长档案</h2><div className="demo-script"><div><b>01 · 收集</b><p>粘贴多天日志、上传工作文档或记下一段经历，保留内容、日期和所属项目。</p></div><div><b>02 · 整理</b><p>先检查工作分组、已有任务关联与统一标签，再由AI生成问题、行动与结果草稿。</p></div><div><b>03 · 确认</b><p>检查每个事实字段，补充依据，确认自己的真实贡献。</p></div><div><b>04 · 回顾</b><p>按周期汇总已确认的证据，生成可编辑、可导出的成长材料。</p></div></div></section>
  </div>}
 </>;
}
