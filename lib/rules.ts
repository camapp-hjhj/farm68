export const names = ['Lan Anh','Thanh','Duyên','Ngọc','Nhi'];
export const animals = ['🐻','🦊','🐰','🐱','🐼'];
export const tasks = ['Check-in buổi sáng và thực hành thiền','Viết lòng biết ơn và mục tiêu','Đọc sách và vận động phù hợp','Làm việc tập trung và học chuyên môn','Chia sẻ, reflection và thiền cuối ngày','Chuẩn bị cho ngày mai và nghỉ ngơi đúng giờ'];
export const prompts = ['Điều tốt hôm nay','Việc đã hoàn thành / chưa hoàn thành','Vấn đề và giải pháp ngày mai','Bài học đáng nhớ','3–5 ưu tiên cho ngày mai'];
export const defaultSlots = [ ['05:00','06:00','Thiền & khởi đầu ngày mới'],['06:00','07:00','Đọc sách / vận động'],['07:30','09:30','Deep work buổi sáng'],['10:00','12:00','Deep work cuối sáng'],['14:00','16:00','Deep work buổi chiều'],['16:00','17:00','Đọc sách / vận động'],['18:00','20:00','Deep work buổi tối'],['20:00','21:00','Hoàn thành mục tiêu'],['21:00','22:00','Chia sẻ sách & thiền cuối ngày'] ];
export function initialConfig(){ return {members:names.map((name,i)=>({id:String(i),name,animal:animals[i],email:'',role:i===3||i===4?'admin':'member',deposit:i===0||i===3?5000000:1000000,reminds:i===4?'':String((i+1)%4)})),slots:defaultSlots.map((s,i)=>({id:String(i),start:s[0],end:s[1],title:s[2],grace:i===0?5:0})),pass:1116,penaltyOne:50000,penaltyMany:100000,lateViolation:false,heavyLimit:4,lead:'4',restDay:0}; }
export function vnDate(now=new Date()){ return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
export function secondsVN(now=new Date()){const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now).split(':').map(Number);return p[0]*3600+p[1]*60+p[2]+now.getUTCMilliseconds()/1000;}
export function sec(t:string){const [h,m]=t.split(':').map(Number);return h*3600+m*60;}
export function checkState(slot:any, now=new Date()){const t=secondsVN(now);if(t<sec(slot.start)-300) return 'early';if(t>=sec(slot.end)) return 'closed';return t<=sec(slot.start)+slot.grace*60?'on-time':'late';}
export function dayNumber(date:string){return Math.floor((Date.parse(date+'T00:00:00+07:00')-Date.parse('2026-11-09T00:00:00+07:00'))/86400000)+1;}
export function score(states:string[],rest=false,review=false,reflection=false){return rest?Number(review)*9+Number(reflection)*9:states.reduce((n,s)=>n+(s==='on-time'?2:s==='late'?1:0),0);}
export function fine(count:number,c:any){return count===0?0:count===1?c.penaltyOne:c.penaltyMany;}
