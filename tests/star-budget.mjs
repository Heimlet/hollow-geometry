import assert from 'node:assert/strict';
import {createStarBudget} from '../js/star-budget.js';
const budget=createStarBudget();let value=1;
for(let i=0;i<600;i++)assert.equal(budget.update(1/60),1,'Fast devices retain all cinematic stars');
for(let i=0;i<500;i++){const next=budget.update(1/25);assert.ok(next<=value&&value-next<.02,'Density falls gradually');value=next;}
assert.ok(value<.01,'Sustained slow frames can shed all extras');
assert.equal(budget.update(3),value,'Suspension is not a performance sample');
assert.equal(budget.update(1/25,false),value,'Reading, pause and hidden tabs do not alter density');
for(let i=0;i<3600;i++){value=budget.update(1/60);assert.ok(value>=0&&value<=1);}
assert.ok(value>.99,'Stable performance can slowly restore the full sky');
console.log('PASS: adaptive star budget, smooth degradation/recovery and ignored inactive frames');
