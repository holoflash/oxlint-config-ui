export function calculateNextIndex(
  currentIndex: number,
  maxIndex: number,
  direction: "up" | "down",
): number {
  if (direction === "up") {
    return currentIndex === 0 ? maxIndex : currentIndex - 1;
  } else {
    return currentIndex === maxIndex ? 0 : currentIndex + 1;
  }
}

export function skipDividers(
  categories: string[],
  startIndex: number,
  maxIndex: number,
  direction: "up" | "down",
): number {
  let nextIndex = startIndex;

  while (categories[nextIndex].startsWith("-")) {
    nextIndex = calculateNextIndex(nextIndex, maxIndex, direction);
  }

  return nextIndex;
}
