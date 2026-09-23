import assert from 'node:assert/strict';
import { transitionAt } from '../js/camera-transition.js';
for (const depth of [.01, .4, 1]) {
  for (const time of [0, 100, 600, 1199]) {
    const frame = transitionAt(time, 1200, 900, depth);
    assert.equal(frame.depth, depth); assert.equal(frame.flattening, false);
  }
  let previous = depth;
  for (let time = 1200; time <= 2100; time += 10) {
    const frame = transitionAt(time, 1200, 900, depth);
    assert.equal(frame.move, 1); assert.ok(frame.depth <= previous);
    previous = frame.depth;
  }
  assert.equal(previous, 0); assert.equal(transitionAt(2100,1200,900,depth).done,true);
}
assert.equal(transitionAt(1200,1200,900,0).done,true);
console.log('PASS: camera moves before flattening, continuous monotonic depth, exact orthographic endpoint');
