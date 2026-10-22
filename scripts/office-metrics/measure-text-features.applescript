-- measure-text-features.applescript — PowerPoint's own text geometry, read
-- through its object model (the AppleScript face of VBA's TextRange
-- BoundLeft / BoundTop / Lines / Characters), then the deck saved as PDF for
-- what the object model does not expose (bullets, underline rules, baselines).
--
--   osascript measure-text-features.applescript <deck.pptx> <out.pdf>
--
-- Prints TSV on stdout (numbers in the system locale — the caller normalises
-- the decimal comma):
--   S  slide  name  left  top  width  height
--   L  slide  index  offset  length  left  top  width  height  content
--   C  slide  offset  left  width
-- Offsets are PowerPoint's: 1-based over the shape text, paragraphs joined
-- by \r, <a:br/> = \v. Content escapes \r → ⏎, \v → ↵, tab → ⇥.
-- The deck must sit inside PowerPoint's sandbox container (no access prompt).

on clean(s)
	set AppleScript's text item delimiters to return
	set parts to text items of s
	set AppleScript's text item delimiters to "⏎"
	set s to parts as text
	set AppleScript's text item delimiters to (ASCII character 11)
	set parts to text items of s
	set AppleScript's text item delimiters to "↵"
	set s to parts as text
	set AppleScript's text item delimiters to tab
	set parts to text items of s
	set AppleScript's text item delimiters to "⇥"
	set s to parts as text
	set AppleScript's text item delimiters to linefeed
	set parts to text items of s
	set AppleScript's text item delimiters to "⏎"
	set s to parts as text
	set AppleScript's text item delimiters to ""
	return s
end clean

on run argv
	set deckPath to item 1 of argv
	set pdfPath to item 2 of argv
	set buf to {}
	tell application "Microsoft PowerPoint"
		repeat with pi from (count of presentations) to 1 by -1
			if (full name of presentation pi) is deckPath then close presentation pi saving no
		end repeat
		open POSIX file deckPath
		set pres to active presentation
		set slideCount to count of slides of pres
		repeat with si from 1 to slideCount
			set sl to slide si of pres
			repeat with k from 1 to (count of shapes of sl)
				set shp to shape k of sl
				set end of buf to "S" & tab & si & tab & (name of shp) & tab & (left position of shp) & tab & (top of shp) & tab & (width of shp) & tab & (height of shp)
				set tf to text frame of shp
				set tr to text range of tf
				set nLines to count of lines of tr
				repeat with li from 1 to nLines
					set ln to line li of tr
					set end of buf to "L" & tab & si & tab & li & tab & (offset of ln) & tab & (text length of ln) & tab & (left bounds of ln) & tab & (top bounds of ln) & tab & (bounds width of ln) & tab & (bounds height of ln) & tab & my clean(content of ln)
				end repeat
				set nChars to count of characters of tr
				repeat with ci from 1 to nChars
					set ch to character ci of tr
					set end of buf to "C" & tab & si & tab & ci & tab & (left bounds of ch) & tab & (bounds width of ch)
				end repeat
			end repeat
		end repeat
		save pres in POSIX file pdfPath as save as PDF
		close pres saving no
	end tell
	set AppleScript's text item delimiters to linefeed
	set outText to buf as text
	set AppleScript's text item delimiters to ""
	return outText
end run
