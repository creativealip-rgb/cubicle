import { describe, expect, it } from "vitest";
import { buildTimeReport } from "./time-reporting";

const entries = [
 { projectId:"p1",projectName:"Alpha",taskId:"t1",taskTitle:"Design",userId:"u1",userName:"A",durationMinutes:120,billable:true,hourlyRate:"100000" },
 { projectId:"p1",projectName:"Alpha",taskId:null,taskTitle:null,userId:"u2",userName:"B",durationMinutes:60,billable:false,hourlyRate:"200000" },
 { projectId:"p2",projectName:"Beta",taskId:"t2",taskTitle:"Build",userId:"u1",userName:"A",durationMinutes:30,billable:true,hourlyRate:"60000" },
];

describe("MH3 time reporting",()=>{
 it("summarizes billable split and value",()=>{const r=buildTimeReport(entries);expect(r.summary).toEqual({totalMinutes:210,billableMinutes:150,nonBillableMinutes:60,billableValue:230000});});
 it("groups by project task and member",()=>{const r=buildTimeReport(entries);expect(r.byProject[0]).toMatchObject({id:"p1",minutes:180,billableMinutes:120,value:200000});expect(r.byTask).toHaveLength(3);expect(r.byMember[0]).toMatchObject({id:"u1",minutes:150,value:230000});});
});
