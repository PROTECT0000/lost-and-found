/** True on phones and tablets, where a `capture` file input opens the native camera app. */
export function isMobileDevice() {
  const uaData = (navigator as Navigator & { userAgentData?: { mobile: boolean } }).userAgentData
  if (uaData?.mobile) return true
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return true
  // iPadOS identifies itself as macOS; tell it apart by touch support.
  return /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1
}
