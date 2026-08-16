import fs from 'fs';

// drawtext needs an explicit fontfile for Hangul — fontconfig's default pick
// silently renders Korean text as nothing (verified: DejaVu-family default
// produces a blank frame, no error). Since this app runs on the user's own
// machine (not a fixed container), we can't assume one exact font path, so
// this checks a short list of real, commonly-installed CJK-capable fonts
// across Linux/macOS/Windows and uses the first one that actually exists.
const CANDIDATE_FONTS = [
  '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
  '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
  '/usr/share/fonts/truetype/noto/NotoSansKR-Regular.ttf',
  '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
  'C:\\Windows\\Fonts\\malgun.ttf',
  '/System/Library/Fonts/Supplemental/AppleSDGothicNeo.ttc',
  '/System/Library/Fonts/AppleSDGothicNeo.ttc',
];

let cached;

export function resolveKoreanCapableFont() {
  if (cached !== undefined) return cached;
  cached = CANDIDATE_FONTS.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  }) || null;
  return cached;
}
