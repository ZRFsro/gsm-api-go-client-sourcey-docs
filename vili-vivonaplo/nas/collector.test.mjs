import assert from 'node:assert/strict';
import test from 'node:test';
import {resolveScheduledEvent, scheduleCandidates} from './collector.mjs';

const host = 'https://www.fencingtimelive.com';
const eventUrl = (id, action = 'competitors') => host + '/events/' + action + '/' + id.repeat(32);
const boys = eventUrl('a');
const second = eventUrl('b');
const scheduleUrl = host + '/tournaments/eventSchedule/' + 'c'.repeat(32) + '#today';
const event = {id:'existing-opava', category:'U11 fiú tőr', tournament_schedule:scheduleUrl};
const links = [
 {url:eventUrl('a','view'),text:'Fleret – Mini žáci'},
 {url:boys,text:'Competitors',context:'U-11 Boys Foil'},
 {url:eventUrl('d'),text:'U11 Girls Foil'},
 {url:eventUrl('e'),text:'U13 Boys Foil'},
 {url:eventUrl('f'),text:'U11 Boys Epee'},
 {url:'https://example.test/events/view/' + 'a'.repeat(32),text:'U11 Boys Foil'}
];

test('finds the correct division and normalizes duplicate links',()=>{
 assert.deepEqual(scheduleCandidates(links,event.category),[boys]);
});

test('accepts U11 mixed foil for the boys listing and confirms the fencer before linking',async()=>{
 const mixed=eventUrl('b');
 const schedule=[...links,{url:mixed,text:'U-11 Mixed Foil'},{url:eventUrl('9'),text:'U-13 Mixed Foil'}];
 assert.deepEqual(scheduleCandidates(schedule,event.category),[boys,mixed]);
 assert.deepEqual(scheduleCandidates(schedule,'U11 vegyes tőr'),[mixed]);
 const saved=[];
 const result=await resolveScheduledEvent(event,async url=>url===scheduleUrl?{links:schedule}:
  {confirmed:url===mixed,title:'U-11 Mixed Foil',rows:['STERMENSZKY Vilmos']},body=>saved.push(body));
 assert.equal(result.event.source_url,mixed);
 assert.equal(saved[0].event_id,event.id);
});

test('binds only the confirmed competition to the original journal entry',async()=>{
 const visited=[], saved=[];
 const result=await resolveScheduledEvent(event,async url=>{
  visited.push(url);
  return url===scheduleUrl?{links}:{confirmed:true,title:'Mini žáci – Fleret',rows:['STERMENSZKY Vilmos']};
 },body=>saved.push(body));
 assert.deepEqual(visited,[scheduleUrl,boys]);
 assert.equal(result.event.source_url,boys);
 assert.equal(saved.length,1);
 assert.equal(saved[0].event_id,event.id);
 assert.equal(saved[0].fencer_confirmed,true);
});

test('retries without writing when the name is absent, login expired or two competitions match',async()=>{
 const noWrite=()=>assert.fail('No source should be written');
 for(const [page,status,extra] of [
  [{confirmed:false},'no_match',[]],
  [{login:true},'login_required',[]],
  [{confirmed:true},'ambiguous',[{url:second,text:'U11 Boys Foil'}]]
 ]){
  const found=await resolveScheduledEvent(event,async url=>url===scheduleUrl?{links:[...links,...extra]}:page,noWrite);
  assert.deepEqual(found,{status});
 }
});
