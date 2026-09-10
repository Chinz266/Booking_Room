const labels:Record<string,string> = {pending:"รออนุมัติ",approved:"อนุมัติแล้ว",rejected:"ไม่อนุมัติ",cancelled:"ยกเลิกแล้ว"};
export function StatusBadge({status}:{status:string}) { return <span className={`status ${status}`}>{labels[status] || status}</span>; }
