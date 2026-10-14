import { Check, Palette } from 'lucide-react';

export type Appearance = 'warm' | 'cool';
export const APPEARANCE_KEY = 'growth-evidence-appearance';

const themes: { id: Appearance; name: string; description: string }[] = [
 { id: 'warm', name: '暖纸 · 松绿', description: '暖白纸面、松绿重点，适合安静地记录与回看。' },
 { id: 'cool', name: '雾白 · 灰蓝', description: '清爽纸面、灰蓝重点，让工作档案更简洁。' },
];

export default function AppearanceSettings({ value, onChange }: { value: Appearance; onChange: (theme: Appearance) => void }) {
 return <section className="panel appearance-panel">
  <div className="panel-heading"><div><h2><Palette size={19}/>界面配色</h2><p>点击即可切换，当前浏览器会记住你的选择。</p></div></div>
  <div className="appearance-options">{themes.map(theme=><button key={theme.id} className={`appearance-option ${value===theme.id?'selected':''}`} data-preset={theme.id} aria-label={`使用${theme.name}配色`} aria-pressed={value===theme.id} onClick={()=>onChange(theme.id)}>
   <span className="appearance-preview" aria-hidden="true"><span className="preview-sidebar"/><span className="preview-content"><i/><span><i/><i/></span><i/></span></span>
   <span className="appearance-description"><b>{theme.name}{value===theme.id&&<span><Check size={14}/>已选</span>}</b><small>{theme.description}</small></span>
  </button>)}</div>
 </section>;
}
