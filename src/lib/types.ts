export type Room = { id:number; room_number:number|string; room_name:string; status:string };
export type Booking = { id:string; room:string|number; booking_date:string; start_time:string; end_time:string; name?:string; student_id?:string; purpose:string; status:"pending"|"approved"|"rejected"|"cancelled"|string; status_reason?:string; updated_at?:string; updated_by?:string };
export type ApiResponse<T> = { success:boolean; data?:T; message?:string; code?:string };
