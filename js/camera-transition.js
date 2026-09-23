/** Two non-overlapping stages: orient/frame first, then remove perspective. */
export const ease = t => t < .5 ? 4*t*t*t : 1 - (-2*t + 2)**3/2;
export function transitionAt(elapsed, moveDuration, depthDuration, initialDepth) {
  const move = ease(Math.max(0, Math.min(1, elapsed / moveDuration)));
  const flatten = ease(Math.max(0, Math.min(1, (elapsed - moveDuration) / depthDuration)));
  return { move, depth: initialDepth * (1 - flatten), flattening: elapsed >= moveDuration,
    done: elapsed >= moveDuration + (initialDepth > 0 ? depthDuration : 0) };
}
