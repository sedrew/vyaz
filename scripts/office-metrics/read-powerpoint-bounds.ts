/**
 * read-powerpoint-bounds.ts — drive real PowerPoint via AppleScript, no
 * manual "open, save, export SVG, eyeball it" step for the numbers this
 * checks.
 *
 * ⚠️ MUST be run from a normal, logged-in Terminal on your Mac — NOT from
 * inside this agent session. A headless/agent session has no WindowServer
 * connection, so PowerPoint can't paint a window: `open` silently no-ops,
 * `make new slide` fails with "Can't make class slide" (-2710), and
 * `System Events` GUI-scripting hangs forever waiting on an Accessibility
 * prompt nobody can click. None of that is a scripting bug — it's confirmed
 * by `osascript -e 'tell application "Microsoft PowerPoint" to count of
 * windows'` returning 0 even right after `open`. Run this file yourself:
 *
 *   bun scripts/office-metrics/read-powerpoint-bounds.ts textframe-fit.pptx
 *   bun scripts/office-metrics/read-powerpoint-bounds.ts line-spacing.pptx
 *
 * What it does, per shape with a text frame, on every slide of the given
 * .pptx (opened from `scripts/office-metrics/` if given a bare filename):
 *   1. opens the file in Microsoft PowerPoint (real app, real layout engine)
 *   2. saves it in place — this is what makes PowerPoint recompute any
 *      `fit:'resize'` (`<a:spAutoFit/>`) shape's `cy`, the actual question
 *      for `<name>@fit` shapes in textframe-fit.pptx
 *   3. for every shape: width/height (post-save, so @fit shapes report their
 *      recomputed size) and `get rotated text bounds` on its text range — the
 *      shape's rendered text-bounding box straight from PowerPoint's own
 *      layout, in points, no SVG export / pixel-scanning needed
 *   4. closes the file (no further save) and writes JSON next to the .pptx
 *      (`<name>.bounds.json`)
 *
 * Cross-check with vyaz: `bun scripts/office-metrics/check-textframe-fit.ts`
 * reads this JSON next to `textframe-fit.json` and diffs them.
 *
 * AppleScript notes (found the hard way — PowerPoint.sdef quirks):
 *   - bareword `top` collides with another suite's term and makes the
 *     compiler treat `top of s` as a SET target ("Access denied" -10003) even
 *     inside `get`/`set x to`. We don't need shape position here, so we just
 *     don't touch `top` / `left position`.
 *   - `open` wants a real path object, not a bare POSIX string:
 *     `POSIX file "/abs/path"`.
 *   - the SVG export format is NOT in PowerPoint's AppleScript "save as" or
 *     shape "save as picture" enumerators (checked `PowerPoint.sdef` —only
 *     PNG/JPEG/GIF/PICT/BMP/TIFF/PDF are there). That's why this script reads
 *     numbers back via `get rotated text bounds` instead of asking you to
 *     export SVG.
 *   - `real as text` uses the *system locale's* decimal separator (a comma on
 *     e.g. a Russian-locale Mac — `302.4` becomes `302,4`), which both breaks
 *     JSON and, worse, collides with a `,`-joined coordinate list (can't tell
 *     a list separator from a decimal comma apart anymore). So every real
 *     number is formatted locale-independently by the `pt()` handler below
 *     (fixed-point via integer div/mod, never `as text` on a real), and lists
 *     are joined element-by-element rather than via `(list as text)`.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve, dirname, isAbsolute, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const arg = process.argv[2];
if (!arg) {
  console.error('usage: bun scripts/office-metrics/read-powerpoint-bounds.ts <file.pptx>');
  process.exit(1);
}
const pptxPath = isAbsolute(arg) ? arg : resolve(HERE, arg);

const script = `
-- fixed-point formatting for a real number, locale-independent (never \`as text\`
-- on a real — the system locale's decimal separator can be a comma)
on pt(n)
	set isNeg to n < 0
	if isNeg then
		set absVal to -n
	else
		set absVal to n
	end if
	-- no built-in "abs" command in AppleScript — and short names like "ip"/"fp"
	-- collide with unrelated terms in some suite (same class of bug as the
	-- bareword "top" one above), so these are spelled out
	set cents to round (absVal * 100) rounding as taught in school
	set intPart to cents div 100
	set fracPart to cents mod 100
	set fracText to fracPart as text
	if length of fracText < 2 then set fracText to "0" & fracText
	set outStr to (intPart as text) & "." & fracText
	if isNeg then set outStr to "-" & outStr
	return outStr
end pt

-- join a list of reals as "pt(x1),pt(x2),..." without ever coercing the whole
-- list to text (that reintroduces the locale decimal-comma problem)
on joinPts(lst)
	set outText to ""
	repeat with i from 1 to count of lst
		if i > 1 then set outText to outText & ","
		set outText to outText & my pt(item i of lst)
	end repeat
	return outText
end joinPts

-- JSON-escape a string (avoids shell-style \`quoted form of\`, which the JS
-- side would have to un-escape differently)
on jsonStr(t)
	set out to ""
	repeat with c in t
		set ch to c as text
		if ch is "\\"" then
			set out to out & "\\\\\\""
		else if ch is "\\\\" then
			set out to out & "\\\\\\\\"
		else
			set out to out & ch
		end if
	end repeat
	return "\\"" & out & "\\""
end jsonStr

set pptxPath to POSIX file ${JSON.stringify(pptxPath)}
tell application "Microsoft PowerPoint"
	activate
	open pptxPath
	set thePres to active presentation
	-- force PowerPoint to lay out + recompute any spAutoFit shape, then persist it
	save thePres
	set slideCount to count of slides of thePres
	set outRecords to {}
	repeat with si from 1 to slideCount
		set theSlide to slide si of thePres
		set shapeCount to count of shapes of theSlide
		repeat with shi from 1 to shapeCount
			set s to shape shi of theSlide
			set sName to "?"
			set sW to 0
			set sH to 0
			set boundsText to ""
			try
				set sName to (get name of s)
			end try
			try
				set sW to (get width of s)
			end try
			try
				set sH to (get height of s)
			end try
			try
				if (get has text frame of s) then
					set tf to (get text frame of s)
					if (get has text of tf) then
						set tr to (get text range of tf)
						set b to (get rotated text bounds of tr)
						set boundsText to my joinPts(b)
					end if
				end if
			end try
			set rec to "{" & ¬
				"\\"slide\\":" & si & "," & ¬
				"\\"name\\":" & my jsonStr(sName) & "," & ¬
				"\\"width\\":" & my pt(sW) & "," & ¬
				"\\"height\\":" & my pt(sH) & "," & ¬
				"\\"textBoundsPt\\":[" & boundsText & "]" & ¬
				"}"
			set end of outRecords to rec
		end repeat
	end repeat
	close thePres saving no
	set AppleScript's text item delimiters to ","
	set jsonBody to (outRecords as text)
	set AppleScript's text item delimiters to ""
	return "[" & jsonBody & "]"
end tell
`;

const res = spawnSync('osascript', ['-e', script], { encoding: 'utf8', timeout: 120_000 });

if (res.error || res.status !== 0) {
  console.error('osascript failed:', res.error ?? res.stderr.trim());
  console.error(
    '\nIf this is "-1728 object does not exist" right after `open`, or hangs, you are\n' +
      'almost certainly running this from a headless/agent session with no display —\n' +
      're-run it from a normal Terminal.app / iTerm window instead.',
  );
  process.exit(1);
}

const raw = res.stdout.trim();

let shapes: any[];
try {
  shapes = JSON.parse(raw);
} catch (e) {
  console.error('could not parse AppleScript output as JSON:\n' + res.stdout);
  throw e;
}

const outPath = resolve(dirname(pptxPath), `${basename(pptxPath, '.pptx')}.bounds.json`);
writeFileSync(outPath, JSON.stringify({ source: pptxPath, unit: 'pt', shapes }, null, 2) + '\n');
console.log(`wrote ${outPath} (${shapes.length} shapes)`);
for (const s of shapes) {
  console.log(`  slide ${s.slide}  ${String(s.name).padEnd(20)} ${s.width.toFixed(2)}×${s.height.toFixed(2)}pt`);
}
