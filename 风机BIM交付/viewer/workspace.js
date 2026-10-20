// Group existing controls without cloning them or resetting simulation state.
export function mountWorkspace(){
 const rules={
  '数据接入':['monitor'],
  '过程回放':['fault','operation','monitor'], '风况仿真':['operation','fault'], '转矩平衡':['operation'], '配套储能':['operation'],
  '传动系统透视':['structure','operation'], '模型视图':['structure','monitor'],
  '构件目录':['structure','monitor'], '关键部件健康监测':['fault','monitor'],
  '构件属性':['structure','fault','monitor'], '测风与偏航对风':['structure'],
  '发电与并网路径':['structure','operation'], '故障教学':['fault'], '版本与下载':['all']
 };
 const groups=[];
 for(const aside of document.querySelectorAll('main > aside')){
  let group=null;
  for(const node of [...aside.childNodes]){
   if(node.nodeName==='H2'){
    group=document.createElement('div');group.className='workspace-group';
    const key=Object.keys(rules).find(key=>node.textContent.startsWith(key));
    group.dataset.modes=(rules[key]||['all']).join(' ');aside.insertBefore(group,node);groups.push(group);
   }
   if(group)group.append(node);
  }
 }
 function select(mode){
  for(const group of groups)group.hidden=!group.dataset.modes.split(' ').some(m=>m==='all'||m===mode);
  for(const button of document.querySelectorAll('[data-workspace]')){
   const active=button.dataset.workspace===mode;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
  }
  for(const aside of document.querySelectorAll('main > aside'))aside.scrollTop=0;
 }
 for(const button of document.querySelectorAll('[data-workspace]'))button.onclick=()=>select(button.dataset.workspace);
 select('structure');
 return {select};
}
