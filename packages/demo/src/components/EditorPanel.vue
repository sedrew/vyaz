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
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" fill="currentColor"/></svg>
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive('italic') }"
          @click="editor.chain().focus().toggleItalic().run()"
          title="Italic (Ctrl+I)"
        >
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" fill="currentColor"/></svg>
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive('underline') }"
          @click="editor.chain().focus().toggleUnderline().run()"
          title="Underline (Ctrl+U)"
        >
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z" fill="currentColor"/></svg>
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive('strike') }"
          @click="editor.chain().focus().toggleStrike().run()"
          title="Strikethrough"
        >
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z" fill="currentColor"/></svg>
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive('code') }"
          @click="editor.chain().focus().toggleCode().run()"
          title="Code"
        >
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" fill="currentColor"/></svg>
        </button>
        <div class="color-picker-wrapper">
          <input
            type="color"
            :value="textColor"
            @input="setColor"
            class="color-picker"
            title="Text color"
          />
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-1 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="currentColor"/></svg>
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
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0 12c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z" fill="currentColor"/></svg>
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive('orderedList') }"
          @click="editor.chain().focus().toggleOrderedList().run()"
          title="Ordered list"
        >
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" fill="currentColor"/></svg>
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive('blockquote') }"
          @click="editor.chain().focus().toggleBlockquote().run()"
          title="Blockquote"
        >
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" fill="currentColor"/></svg>
        </button>
        <button
          class="toolbar-btn"
          @click="editor.chain().focus().setHorizontalRule().run()"
          title="Horizontal rule"
        >
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 15h18v-2H3v2zm0 4h18v-2H3v2zm0-8h18V9H3v2zm0-6v2h18V5H3z" fill="currentColor"/></svg>
        </button>
      </div>

      <div class="toolbar-separator"></div>

      <!-- Alignment -->
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive({ textAlign: 'left' }) }"
          @click="editor.chain().focus().setTextAlign('left').run()"
          title="Align left"
        >
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 21h18v-2H3v2zm0-4h14v-2H3v2zm0-4h18v-2H3v2zm0-8v2h18V5H3z" fill="currentColor"/></svg>
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive({ textAlign: 'center' }) }"
          @click="editor.chain().focus().setTextAlign('center').run()"
          title="Align center"
        >
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 21h10v-2H7v2zm-4-4h18v-2H3v2zm0-4h18v-2H3v2zm4-4h10V5H7v2zM3 3v2h18V3H3z" fill="currentColor"/></svg>
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive({ textAlign: 'right' }) }"
          @click="editor.chain().focus().setTextAlign('right').run()"
          title="Align right"
        >
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V5H9v2zM3 3v2h18V3H3z" fill="currentColor"/></svg>
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor.isActive({ textAlign: 'justify' }) }"
          @click="editor.chain().focus().setTextAlign('justify').run()"
          title="Justify"
        >
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V5H3v2zm0-4v2h18V3H3z" fill="currentColor"/></svg>
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
          :value="currentFontFamily"
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
          :value="currentFontSize"
          @change="setFontSize(Number(($event.target as HTMLSelectElement).value))"
          title="Font size"
        >
          <option v-for="s in fontSizes" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <div class="toolbar-separator"></div>

      <!-- Undo/Redo -->
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          @click="editor.chain().focus().undo().run()"
          title="Undo (Ctrl+Z)"
        >
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" fill="currentColor"/></svg>
        </button>
        <button
          class="toolbar-btn"
          @click="editor.chain().focus().redo().run()"
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M11.5 8c-4.65 0-8.58 3.03-9.97 7.22l2.37.78c1.05-3.19 4.06-5.5 7.6-5.5 1.96 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6C16.55 8.99 14.15 8 11.5 8z" fill="currentColor"/></svg>
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
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import FontFamily from '@tiptap/extension-font-family'
import { watch, onBeforeUnmount, ref } from 'vue'

const emit = defineEmits<{
  update: [json: unknown]
}>()

const textColor = ref('#000000')

function setColor(e: Event) {
  const color = (e.target as HTMLInputElement).value
  textColor.value = color
  editor.value?.chain().focus().setColor(color).run()
}

const fontFamilies = [
  'Roboto',
  'Lora',
  'Open Sans',
  'Merriweather',
  'JetBrains Mono',
]

const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72]

const currentFontFamily = ref('Roboto')
const currentFontSize = ref(16)

function setFontFamily(family: string) {
  currentFontFamily.value = family
  editor.value?.chain().focus().setFontFamily(family).run()
}

function setFontSize(size: number) {
  currentFontSize.value = size
  // Tiptap FontSize isn't installed — use TextStyle attrs
  editor.value?.chain().focus().setMark('textStyle', { fontSize: size }).run()
}

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    TextStyle,
    Color,
    Underline,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Subscript,
    Superscript,
    FontFamily,
  ],
  content: `
    <h1>Vyaz Demo</h1>
    <p>Edit this text to see live <strong>SVG</strong> preview on the right.</p>
    <p>Try <em>italic</em>, <u>underline</u>, <s>strikethrough</s>, and <code>code</code>.</p>
    <h2>Heading Level 2</h2>
    <p>Another paragraph with <strong>bold</strong> and <em>italic</em> text combined.</p>
  `,
  editorProps: {
    attributes: {
      class: 'prose-editor',
    },
  },
  onUpdate: ({ editor }) => {
    emit('update', editor.getJSON())
  },
})

// Emit initial content
watch(editor, (ed) => {
  if (ed) {
    emit('update', ed.getJSON())
  }
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