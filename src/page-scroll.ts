/** Document navigation only; planner graph and drawer scroll remain owned by their components. */
export function createPageScrollController(scroll:(options:ScrollToOptions)=>void,frame:(restore:()=>void)=>void){
 let page:string|undefined,navigation=0,restoration=0;
 return {
  commitPage(next:string){
   if(page===next)return;
   page=next;navigation++;restoration++;
   scroll({top:0,left:0,behavior:'instant'});
  },
  captureReference(top:number){
   const origin=page,epoch=navigation;restoration++;
   return ()=>{
    const request=++restoration;
    frame(()=>{if(page===origin&&navigation===epoch&&restoration===request)scroll({top,behavior:'instant'});});
   };
  }
 };
}
