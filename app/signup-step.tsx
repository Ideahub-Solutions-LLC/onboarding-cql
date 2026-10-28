'use client';
import {useContext} from 'react';
import {ArrowUpRight,Check,UserRound,CheckCircle2} from 'lucide-react';
import {FormContext,CheckField,Note} from './form-parts';

export default function SignupStep({config}:any){
 const {data,set}=useContext(FormContext);
 const available=config.signupOptions.filter((o:any)=>o.enabled&&o.url);
 const selected=available.find((o:any)=>o.id===data.signupId);
 const choose=(o:any)=>{set('signupId',o.id);set('plan',o.name);set('alreadyHaveAccount',false);set('signupDone',false);};
 const card=(o:any)=><button type="button" key={o.id} className={'signup-option '+(!data.alreadyHaveAccount&&selected?.id===o.id?'selected':'')} onClick={()=>choose(o)}><div className="signup-option-top"><span className="radio">{!data.alreadyHaveAccount&&selected?.id===o.id&&<span/>}</span>{o.badge&&<em>{o.badge}</em>}</div><h3>{o.name}</h3><p>{o.description||'Create your CQL account to get started.'}</p>{!!o.features?.length&&<ul className="account-features">{o.features.map((feature:string,i:number)=><li key={i}><Check size={14}/><span>{feature}</span></li>)}</ul>}<span className="choose-label">{!data.alreadyHaveAccount&&selected?.id===o.id?'Selected':'Choose this option'} {!data.alreadyHaveAccount&&selected?.id===o.id?<Check size={14}/>:null}</span></button>;
 return <div className="signup-step">
 {config.priceList&&<a className="price-list-download" href={'/api/price-lists/'+config.priceList.id}><span><strong>View the current price list</strong><small>{config.priceList.name}</small></span><ArrowUpRight size={17}/></a>}
 <div className="signup-instructions"><span><b>1</b> Choose an option</span><span><b>2</b> Finish signup</span><span><b>3</b> Return & continue</span></div>
 <div className="signup-options">{available.map(card)}</div>
 {!available.length&&<Note>Contact your team for your account link, or confirm an existing account below.</Note>}
 <button className={'existing-account '+(data.alreadyHaveAccount?'selected':'')} onClick={()=>{set('alreadyHaveAccount',true);set('signupId','');set('plan','I already have an account');set('signupDone',false);}}><UserRound size={18}/><span>I already have a CQL account<small>Continue using my existing workspace.</small></span>{data.alreadyHaveAccount&&<CheckCircle2 size={18}/>}</button>
 {!data.alreadyHaveAccount&&selected&&<div className="signup-next"><div className="signup-next-number">2</div><div><h3>Open your signup page.</h3><p>Finish signup in the new tab, then come back to this page. Your onboarding will be waiting here.</p><a className="btn primary" href={selected.url} target="_blank" rel="noopener noreferrer" onClick={()=>set('signupOpened',true)}>{selected.buttonLabel||'Open signup'} <ArrowUpRight size={17}/></a><small>Pricing and access terms are shown on the signup page.</small></div></div>}
 {(data.alreadyHaveAccount||selected)&&<div className="signup-confirm"><CheckField name="signupDone">{data.alreadyHaveAccount?'I confirm that I already have a CQL account.':'I’ve completed signup and I’m ready to continue onboarding.'}</CheckField><p>Your team will verify the account during setup. This confirmation does not verify payment or activate a subscription.</p></div>}
 </div>
}
