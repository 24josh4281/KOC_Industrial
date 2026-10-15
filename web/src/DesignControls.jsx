import React, {useState} from 'react';
import design from '../../design.json';

export function useDesign() {
  const [profile,setProfile]=useState(design.default_profile);
  const [large,setLarge]=useState(false);
  const p=design.profiles[profile];
  return {profile,large,setProfile,setLarge,style:{'--navy':p.primary,'--blue':p.accent,'--secondary':p.secondary,'--line':p.border,'--theme-panel':p.panel,'--theme-font':p.font,'--theme-radius':p.radius+'px','--reading-size':large?'18px':'16px','--gov-fill':p.governing_fill??p.panel,'--gov-line':p.governing_line??p.border,'--ink':p.text??'#263445','--ink-muted':p.muted??'#526174'}};
}
export default function DesignControls({settings}) {
  return <div className="design-controls" aria-label="화면 표시 설정">
    <label>디자인<select aria-label="디자인 스타일" value={settings.profile} onChange={e=>settings.setProfile(e.target.value)}>{Object.entries(design.profiles).map(([id,p])=><option key={id} value={id}>{p.label}</option>)}</select></label>
    <button aria-pressed={settings.large} onClick={()=>settings.setLarge(!settings.large)}>글자 {settings.large?'기본 크기':'크게'}</button>
  </div>;
}
