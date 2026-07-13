(function exposeSwordfightGeometry(root, factory) {
  "use strict";

  const geometry = factory();
  if (typeof module === "object" && module.exports) module.exports = geometry;
  else root.SWORDFIGHT_GEOMETRY = geometry;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function normalizeAngle(angle) {
    const tau = Math.PI * 2;
    const normalized = angle % tau;
    return normalized < 0 ? normalized + tau : normalized;
  }

  function lerpAngle(current, target, amount) {
    let difference = normalizeAngle(target) - normalizeAngle(current);
    if (difference > Math.PI) difference -= Math.PI * 2;
    if (difference < -Math.PI) difference += Math.PI * 2;
    return current + difference * amount;
  }

  function circlesOverlap(aX, aY, aRadius, bX, bY, bRadius) {
    const deltaX = aX - bX;
    const deltaY = aY - bY;
    const combinedRadius = aRadius + bRadius;
    return deltaX * deltaX + deltaY * deltaY < combinedRadius * combinedRadius;
  }

  function pointInLake(x, y, lake) {
    if (
      x < lake.bounds.minX ||
      x > lake.bounds.maxX ||
      y < lake.bounds.minY ||
      y > lake.bounds.maxY
    ) return false;

    let inside = false;
    for (let currentIndex = 0, previousIndex = lake.points.length - 1;
      currentIndex < lake.points.length;
      previousIndex = currentIndex++) {
      const current = lake.points[currentIndex];
      const previous = lake.points[previousIndex];
      const crosses = (current.y > y) !== (previous.y > y) &&
        x < ((previous.x - current.x) * (y - current.y)) /
          (previous.y - current.y) + current.x;
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function pointToSegmentDistanceSquared(pointX, pointY, start, end) {
    const segmentX = end.x - start.x;
    const segmentY = end.y - start.y;
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
    if (segmentLengthSquared === 0) {
      const deltaX = pointX - start.x;
      const deltaY = pointY - start.y;
      return deltaX * deltaX + deltaY * deltaY;
    }
    const projection = clamp(
      ((pointX - start.x) * segmentX + (pointY - start.y) * segmentY) /
        segmentLengthSquared,
      0,
      1
    );
    const closestX = start.x + segmentX * projection;
    const closestY = start.y + segmentY * projection;
    const deltaX = pointX - closestX;
    const deltaY = pointY - closestY;
    return deltaX * deltaX + deltaY * deltaY;
  }

  function circleIntersectsLake(x, y, radius, lake) {
    if (
      x + radius < lake.bounds.minX ||
      x - radius > lake.bounds.maxX ||
      y + radius < lake.bounds.minY ||
      y - radius > lake.bounds.maxY
    ) return false;
    if (pointInLake(x, y, lake)) return true;

    const radiusSquared = radius * radius;
    for (let index = 0; index < lake.points.length; index++) {
      const start = lake.points[index];
      const end = lake.points[(index + 1) % lake.points.length];
      if (pointToSegmentDistanceSquared(x, y, start, end) <= radiusSquared) return true;
    }
    return false;
  }

  function circleIntersectsAnyLake(lakes, x, y, radius) {
    return lakes.some((lake) => circleIntersectsLake(x, y, radius, lake));
  }

  return Object.freeze({
    clamp,
    normalizeAngle,
    lerpAngle,
    circlesOverlap,
    circleIntersectsAnyLake
  });
});
