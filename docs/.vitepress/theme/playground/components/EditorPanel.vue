<template>
  <div class="editor-panel">
    <div class="editor-header">
      <h2>Editor</h2>
    </div>
    <div class="toolbar" v-if="editor">
      <!-- Inline formatting -->
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive('bold') }"
          @click="editor.chain().focus().toggleBold().run()"
          title="Bold (Ctrl+B)"
        >
          <IconBold :size="18" :stroke="1.75" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive('italic') }"
          @click="editor.chain().focus().toggleItalic().run()"
          title="Italic (Ctrl+I)"
        >
          <IconItalic :size="18" :stroke="1.75" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive('underline') }"
          @click="editor.chain().focus().toggleUnderline().run()"
          title="Underline (Ctrl+U)"
        >
          <IconUnderline :size="18" :stroke="1.75" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive('strike') }"
          @click="editor.chain().focus().toggleStrike().run()"
          title="Strikethrough"
        >
          <IconStrikethrough :size="18" :stroke="1.75" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive('code') }"
          @click="editor.chain().focus().toggleCode().run()"
          title="Code"
        >
          <IconCode :size="18" :stroke="1.75" />
        </button>
        <div class="color-picker-wrapper">
          <input
            type="color"
            :value="tb.color"
            @input="setColor"
            class="color-picker"
            title="Text color"
          />
          <IconPalette :size="18" :stroke="1.75" />
        </div>
      </div>

      <div class="toolbar-separator"></div>

      <!-- Headings -->
      <div class="toolbar-group">
        <button
          class="toolbar-btn text-btn"
          :class="{ active: editor.isActive('heading', { level: 1 }) }"
          @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
          title="Heading 1"
        >H1</button>
        <button
          class="toolbar-btn text-btn"
          :class="{ active: editor.isActive('heading', { level: 2 }) }"
          @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
          title="Heading 2"
        >H2</button>
        <button
          class="toolbar-btn text-btn"
          :class="{ active: editor.isActive('heading', { level: 3 }) }"
          @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
          title="Heading 3"
        >H3</button>
      </div>

      <div class="toolbar-separator"></div>

      <!-- Block formatting -->
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive('bulletList') }"
          @click="editor.chain().focus().toggleBulletList().run()"
          title="Bullet list"
        >
          <IconList :size="18" :stroke="1.75" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive('orderedList') }"
          @click="editor.chain().focus().toggleOrderedList().run()"
          title="Ordered list"
        >
          <IconListNumbers :size="18" :stroke="1.75" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive('blockquote') }"
          @click="editor.chain().focus().toggleBlockquote().run()"
          title="Blockquote"
        >
          <IconBlockquote :size="18" :stroke="1.75" />
        </button>
        <button
          class="toolbar-btn"
          @click="editor.chain().focus().setHorizontalRule().run()"
          title="Horizontal rule"
        >
          <IconSeparatorHorizontal :size="18" :stroke="1.75" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive('link') }"
          @click="toggleLink"
          title="Link"
        >
          <IconLink :size="18" :stroke="1.75" />
        </button>
      </div>

      <!-- List options (only when a list is active) -->
      <template v-if="list.active">
        <div class="toolbar-separator"></div>
        <div class="toolbar-group">
          <select v-if="list.ordered" class="toolbar-select" :value="list.numberFormat"
            @change="setListAttr('numberFormat', ($event.target as HTMLSelectElement).value)" title="Numbering">
            <option v-for="f in NUMBER_FORMATS" :key="f" :value="f">{{ f }}</option>
          </select>
          <select v-else class="toolbar-select" :value="list.bulletChar"
            @change="setListAttr('bulletChar', ($event.target as HTMLSelectElement).value)" title="Bullet">
            <option v-for="c in BULLET_CHARS" :key="c" :value="c">{{ c }}</option>
          </select>
          <select class="toolbar-select" :value="list.position"
            @change="setListAttr('position', ($event.target as HTMLSelectElement).value)" title="Marker position">
            <option value="outside">outside</option>
            <option value="inside">inside</option>
          </select>
        </div>
      </template>

      <div class="toolbar-separator"></div>

      <!-- Alignment -->
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive({ textAlign: 'left' }) }"
          @click="editor.chain().focus().setTextAlign('left').run()"
          title="Align left"
        >
          <IconAlignLeft :size="18" :stroke="1.75" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive({ textAlign: 'center' }) }"
          @click="editor.chain().focus().setTextAlign('center').run()"
          title="Align center"
        >
          <IconAlignCenter :size="18" :stroke="1.75" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive({ textAlign: 'right' }) }"
          @click="editor.chain().focus().setTextAlign('right').run()"
          title="Align right"
        >
          <IconAlignRight :size="18" :stroke="1.75" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive({ textAlign: 'justify' }) }"
          @click="editor.chain().focus().setTextAlign('justify').run()"
          title="Justify"
        >
          <IconAlignJustified :size="18" :stroke="1.75" />
        </button>
      </div>

      <div class="toolbar-separator"></div>

      <!-- Subscript / Superscript -->
      <div class="toolbar-group">
        <button
          class="toolbar-btn text-btn"
          :class="{ active: editor.isActive('subscript') }"
          @click="editor.chain().focus().toggleSubscript().run()"
          title="Subscript"
        >A<sub>2</sub></button>
        <button
          class="toolbar-btn text-btn"
          :class="{ active: editor.isActive('superscript') }"
          @click="editor.chain().focus().toggleSuperscript().run()"
          title="Superscript"
        >A<sup>2</sup></button>
      </div>

      <div class="toolbar-separator"></div>

      <!-- Font Family -->
      <div class="toolbar-group">
        <select
          class="toolbar-select"
          :value="tb.fontFamily"
          @change="setFontFamily(($event.target as HTMLSelectElement).value)"
          title="Font family"
        >
          <option v-for="f in fontFamilies" :key="f" :value="f">{{ f }}</option>
        </select>
      </div>

      <div class="toolbar-separator"></div>

      <!-- Font Size -->
      <div class="toolbar-group">
        <select
          class="toolbar-select"
          :value="tb.fontSize"
          @change="setFontSize(Number(($event.target as HTMLSelectElement).value))"
          title="Font size"
        >
          <option v-for="s in fontSizes" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <div class="toolbar-separator"></div>

      <!-- Letter spacing / line height -->
      <div class="toolbar-group">
        <label class="toolbar-num" title="Letter spacing (px)">ls
          <input type="number" step="0.5" :value="tb.letterSpacing"
            @change="setLetterSpacing(Number(($event.target as HTMLInputElement).value))" />
        </label>
        <label class="toolbar-num" title="Line height (×)">lh
          <input type="number" step="0.05" min="0.5" :value="tb.lineHeight"
            @change="setLineHeight(Number(($event.target as HTMLInputElement).value))" />
        </label>
      </div>

      <div class="toolbar-separator"></div>

      <!-- Undo/Redo -->
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          @click="editor.chain().focus().undo().run()"
          title="Undo (Ctrl+Z)"
        >
          <IconArrowBackUp :size="18" :stroke="1.75" />
        </button>
        <button
          class="toolbar-btn"
          @click="editor.chain().focus().redo().run()"
          title="Redo (Ctrl+Shift+Z)"
        >
          <IconArrowForwardUp :size="18" :stroke="1.75" />
        </button>
      </div>
    </div>
    <div class="editor-wrapper">
      <EditorContent :editor="editor" class="editor-content" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { IconAlignCenter, IconAlignJustified, IconAlignLeft, IconAlignRight, IconArrowBackUp, IconArrowForwardUp, IconBlockquote, IconBold, IconCode, IconItalic, IconLink, IconList, IconListNumbers, IconPalette, IconSeparatorHorizontal, IconStrikethrough, IconUnderline } from '@tabler/icons-vue'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import FontFamily from '@tiptap/extension-font-family'
import Link from '@tiptap/extension-link'
import { watch, onBeforeUnmount, ref, reactive } from 'vue'

const emit = defineEmits<{ update: [json: unknown] }>()

// ── Extra TextStyle marks: fontSize + letterSpacing ────────────────────
const TextStyleExtras = Extension.create({
  name: 'textStyleExtras',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontSize?.replace('px', '') || null,
          renderHTML: (a: Record<string, any>) =>
            a.fontSize ? { style: `font-size:${a.fontSize}px` } : {},
        },
        letterSpacing: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.letterSpacing?.replace('px', '') || null,
          renderHTML: (a: Record<string, any>) =>
            a.letterSpacing != null ? { style: `letter-spacing:${a.letterSpacing}px` } : {},
        },
      },
    }]
  },
})

// ── Paragraph/heading node attr: lineHeight ────────────────────────────
const LineHeight = Extension.create({
  name: 'lineHeight',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        lineHeight: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.lineHeight || null,
          renderHTML: (a: Record<string, any>) =>
            a.lineHeight ? { style: `line-height:${a.lineHeight}` } : {},
        },
        spaceBefore: {
          default: null,
          renderHTML: (a: Record<string, any>) =>
            a.spaceBefore != null ? { style: `margin-top:${a.spaceBefore}px` } : {},
        },
        spaceAfter: {
          default: null,
          renderHTML: (a: Record<string, any>) =>
            a.spaceAfter != null ? { style: `margin-bottom:${a.spaceAfter}px` } : {},
        },
      },
    }]
  },
})

// ── Toolbar state (kept in sync with the caret) ───────────────────────
// bundled single-file faces (see ../fonts) — full Latin/Cyrillic/Greek coverage
const fontFamilies = ['Roboto', 'Inter', 'Great Vibes']
const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72]
const tb = reactive({
  fontFamily: 'Roboto',
  fontSize: 16,
  color: '#000000',
  letterSpacing: 0,
  lineHeight: 1.4,
})
const textColor = ref('#000000')

function setColor(e: Event) {
  const c = (e.target as HTMLInputElement).value
  tb.color = c; textColor.value = c
  editor.value?.chain().focus().setColor(c).run()
}
function setFontFamily(family: string) {
  editor.value?.chain().focus().setFontFamily(family).run()
}
function setFontSize(size: number) {
  editor.value?.chain().focus().setMark('textStyle', { fontSize: size }).run()
}
function setLetterSpacing(v: number) {
  editor.value?.chain().focus().setMark('textStyle', { letterSpacing: v }).run()
}
function setLineHeight(v: number) {
  editor.value?.chain().focus().updateAttributes('paragraph', { lineHeight: v })
    .updateAttributes('heading', { lineHeight: v }).run()
}

function syncToolbar() {
  const ed = editor.value
  if (!ed) return
  const ts = ed.getAttributes('textStyle')
  tb.fontFamily = ts.fontFamily || 'Roboto'
  tb.fontSize = ts.fontSize ? Number(ts.fontSize) : 16
  tb.color = ed.getAttributes('textStyle').color || '#000000'
  tb.letterSpacing = ts.letterSpacing != null ? Number(ts.letterSpacing) : 0
  const p = ed.getAttributes('paragraph').lineHeight || ed.getAttributes('heading').lineHeight
  tb.lineHeight = p ? Number(p) : 1.4
  textColor.value = tb.color
}

const NUMBER_FORMATS = ['decimal', 'upper-roman', 'lower-roman', 'upper-alpha', 'lower-alpha']
const BULLET_CHARS = ['•', '◦', '▪', '–', '·', '★']

const ListOptions = Extension.create({
  name: 'listOptions',
  addGlobalAttributes() {
    return [{
      types: ['bulletList', 'orderedList'],
      attributes: {
        bulletChar: { default: null, renderHTML: () => ({}) },
        numberFormat: { default: null, renderHTML: () => ({}) },
        position: { default: null, renderHTML: () => ({}) },
      },
    }]
  },
})

const list = reactive({ active: false, ordered: false, bulletChar: '•', numberFormat: 'decimal', position: 'outside' })
function syncList() {
  const ed = editor.value
  if (!ed) return
  list.ordered = ed.isActive('orderedList')
  list.active = list.ordered || ed.isActive('bulletList')
  const a = ed.getAttributes(list.ordered ? 'orderedList' : 'bulletList')
  list.bulletChar = a.bulletChar || '•'
  list.numberFormat = a.numberFormat || 'decimal'
  list.position = a.position || 'outside'
}
function setListAttr(k: string, v: string) {
  const ed = editor.value
  if (!ed) return
  ed.chain().focus().updateAttributes(list.ordered ? 'orderedList' : 'bulletList', { [k]: v }).run()
}
function toggleLink() {
  const ed = editor.value
  if (!ed) return
  if (ed.isActive('link')) { ed.chain().focus().unsetLink().run(); return }
  const url = window.prompt('URL')
  if (url) ed.chain().focus().setLink({ href: url }).run()
}

const editor = useEditor({
  extensions: [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    TextStyle,
    TextStyleExtras,
    LineHeight,
    Color,
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Subscript,
    Superscript,
    FontFamily,
    Link.configure({ openOnClick: false }),
    ListOptions,
  ],
  content: `
    <h1>Vyaz Playground</h1>
    <p>Edit this text to see the live <strong>SVG</strong> layout on the right.</p>
    <p style="text-align:center">Centered line.</p>
    <p style="text-align:right">Right-aligned. <em>italic</em>, <u>underline</u>, <s>strike</s>, <code>code</code>, sub<sub>2</sub>/super<sup>2</sup>.</p>
    <h2>Heading Level 2</h2>
    <p>Another paragraph with <strong>bold</strong> and <em>italic</em>, plus a longer run so wrapping is visible at narrow widths.</p>
  `,
  editorProps: { attributes: { class: 'prose-editor' } },
  onUpdate: ({ editor }) => { emit('update', editor.getJSON()); syncToolbar(); syncList() },
  onSelectionUpdate: () => { syncToolbar(); syncList() },
})

watch(editor, (ed) => {
  if (ed) { emit('update', ed.getJSON()); syncToolbar(); syncList() }
}, { immediate: true })

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.editor-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #e0e0e0;
}

.editor-header {
  padding: 10px 14px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.editor-header h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ── Toolbar ───────────────────────────────────── */

.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid #e0e0e0;
  background: #fff;
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  z-index: 10;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.toolbar-separator {
  width: 1px;
  height: 24px;
  background: #e0e0e0;
  margin: 0 4px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: #555;
  transition: all 0.12s ease;
}

.toolbar-btn:hover {
  background: #f0f0f0;
  color: #111;
}

.toolbar-btn.active {
  background: #e0e7ff;
  color: #2563eb;
  border-color: #bfdbfe;
}

.toolbar-btn.text-btn {
  font-size: 12px;
  font-weight: 700;
  width: auto;
  padding: 0 6px;
}

/* ── Select dropdowns (font family, size) ───────── */

.toolbar-num { display:inline-flex; align-items:center; gap:3px; font-size:11px; color:#666; }
.toolbar-num input { width:46px; padding:2px 4px; border:1px solid #ccc; border-radius:4px; font-size:11px; }
.toolbar-select {
  padding: 3px 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 12px;
  background: #fff;
  color: #333;
  cursor: pointer;
  outline: none;
  max-width: 120px;
}

.toolbar-select:hover {
  border-color: #999;
}

.toolbar-select:focus {
  border-color: #4a90d9;
  box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.15);
}

/* ── Color picker ───────────────────────────────── */

.color-picker-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 32px;
  height: 32px;
  margin-left: 2px;
}

.color-picker {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
  padding: 0;
  border: none;
}

.color-picker-wrapper svg {
  pointer-events: none;
}

/* ── Editor content ─────────────────────────────── */

.editor-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.editor-content {
  padding: 16px;
  min-height: 100%;
}

:deep(.ProseMirror) {
  outline: none;
  min-height: 300px;
  font-size: 16px;
  line-height: 1.6;
  color: #1a1a1a;
}

:deep(.ProseMirror h1) {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 12px 0;
  line-height: 1.3;
}

:deep(.ProseMirror h2) {
  font-size: 24px;
  font-weight: 600;
  margin: 24px 0 8px 0;
  line-height: 1.3;
}

:deep(.ProseMirror h3) {
  font-size: 20px;
  font-weight: 600;
  margin: 20px 0 6px 0;
  line-height: 1.3;
}

:deep(.ProseMirror p) {
  margin: 0 0 8px 0;
}

:deep(.ProseMirror code) {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.9em;
}

:deep(.ProseMirror pre) {
  background: #1a1a2e;
  color: #e0e0e0;
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
  overflow-x: auto;
}

:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
  padding-left: 24px;
  margin: 8px 0;
}

:deep(.ProseMirror blockquote) {
  border-left: 3px solid #ccc;
  padding-left: 12px;
  margin: 8px 0;
  color: #666;
}

:deep(.ProseMirror hr) {
  border: none;
  border-top: 2px solid #e0e0e0;
  margin: 16px 0;
}
</style>