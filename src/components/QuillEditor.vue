<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Start writing...',
  },
  readOnly: {
    type: Boolean,
    default: false,
  },
  height: {
    type: String,
    default: '400px',
  },
  projectId: {
    type: [String, Number],
    default: null,
  },
  projectType: {
    type: String,
    default: 'magazine',
  },
  disableImages: {
    type: Boolean,
    default: false,
  },
  textOnly: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'update:modelValue',
  'text-change',
  'selection-change',
  'highlight-comments-updated',
  'show-comment',
  'notification',
])

const editorRef = ref(null)
const quill = ref(null)
const showHighlightComment = ref(false)
const showHighlightColorPicker = ref(false)
const highlightComment = ref('')
const selectedText = ref('')
const currentSelection = ref(null)
const highlightComments = ref([])
const selectedHighlightColor = ref('#ffeb3b') // Default yellow
const activeCommentId = ref(null) // Track which comment is currently active
const isUserTyping = ref(false) // Track if user is actively typing (don't restore highlights during typing)
const shouldRestoreHighlights = ref(true) // Flag to control when to restore highlights

// Notification card state
const showNotificationCard = ref(false)
const notificationMessage = ref('')
const notificationType = ref('warning')

// Quill configuration
const quillOptions = {
  theme: 'snow',
  placeholder: props.placeholder,
  readOnly: props.readOnly,
  modules: {
    toolbar: props.textOnly
      ? [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']]
      : [
          [{ header: [1, 2, 3, 4, 5, 6, false] }],
          [{ font: [] }],
          [{ size: ['small', false, 'large', 'huge'] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ script: 'sub' }, { script: 'super' }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ indent: '-1' }, { indent: '+1' }],
          [{ align: [] }],
          ['blockquote', 'code-block'],
          ['link', 'image', 'video'],
          ['clean'],
        ],
    history: {
      delay: 2000,
      maxStack: 500,
      userOnly: true,
    },
  },
}

// Load Quill from CDN
const loadQuill = () => {
  return new Promise((resolve, reject) => {
    // Check if Quill is already loaded
    if (window.Quill) {
      resolve(window.Quill)
      return
    }

    // Load Quill CSS
    const cssLink = document.createElement('link')
    cssLink.rel = 'stylesheet'
    cssLink.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css'
    document.head.appendChild(cssLink)

    // Load Quill JS
    const script = document.createElement('script')
    script.src = 'https://cdn.quilljs.com/1.3.6/quill.min.js'
    script.onload = () => {
      if (window.Quill) {
        resolve(window.Quill)
      } else {
        reject(new Error('Quill failed to load'))
      }
    }
    script.onerror = () => reject(new Error('Failed to load Quill script'))
    document.head.appendChild(script)
  })
}

// Initialize Quill editor
onMounted(async () => {
  try {
    const Quill = await loadQuill()

    await nextTick()

    if (editorRef.value) {
      quill.value = new Quill(editorRef.value, quillOptions)

      // Set initial content
      if (props.modelValue) {
        quill.value.root.innerHTML = props.modelValue
      }

      // Respect readOnly prop at runtime
      quill.value.enable(!props.readOnly)

      // Listen for text changes
      quill.value.on('text-change', (delta, oldDelta, source) => {
        if (source === 'user') {
          // Mark that user is typing - don't restore highlights during this
          isUserTyping.value = true
          shouldRestoreHighlights.value = false

          // Clear background formatting from newly inserted text
          // This prevents new text from inheriting highlight colors
          if (delta && delta.ops) {
            // Process after Quill has updated
            setTimeout(() => {
              const selection = quill.value.getSelection(true)
              if (selection && selection.length === 0) {
                // User is typing (cursor position, not selection)
                const cursorIndex = selection.index

                // Check all newly inserted characters
                delta.ops.forEach((op) => {
                  if (op.insert && typeof op.insert === 'string') {
                    const insertLength = op.insert.length
                    // Check characters that were just inserted (before cursor)
                    for (let i = 0; i < insertLength; i++) {
                      const charIndex = cursorIndex - insertLength + i
                      if (charIndex >= 0) {
                        const format = quill.value.getFormat(charIndex, 1)

                        // If this character has background color, check if it should keep it
                        if (format && format.background) {
                          // Check if this position is part of an existing highlight comment
                          const isPartOfComment = highlightComments.value.some((comment) => {
                            if (comment.resolved) return false
                            const commentStart = comment.range.index
                            const commentEnd = commentStart + comment.range.length
                            // Check if the character is within the comment range
                            return charIndex >= commentStart && charIndex < commentEnd
                          })

                          // Only clear background if it's NOT part of an existing comment
                          // This means the user typed new text that inherited the highlight
                          if (!isPartOfComment) {
                            // Clear background from the newly typed character
                            quill.value.formatText(charIndex, 1, 'background', false)
                          }
                        }
                      }
                    }
                  }
                })
              }
            }, 10) // Small delay to ensure Quill has processed
          }

          const html = quill.value.root.innerHTML
          emit('update:modelValue', html)
          emit('text-change', delta, oldDelta, source)

          // Reset typing flag after a short delay
          setTimeout(() => {
            isUserTyping.value = false
            // Re-enable restoration after user stops typing (for future loads)
            setTimeout(() => {
              shouldRestoreHighlights.value = true
            }, 1000)
          }, 500)
        }
      })

      // Clear format when cursor is placed after a highlighted comment to ensure proper spacing
      quill.value.on('selection-change', (range, oldRange, source) => {
        if (source === 'user' && range && range.length === 0) {
          // User moved cursor - clear format at cursor if it's not part of a comment
          // This ensures proper spacing when typing after highlighted text
          const format = quill.value.getFormat(range.index, 1)
          if (format && format.background) {
            // Check if cursor is within a comment range
            const isInComment = highlightComments.value.some((comment) => {
              if (comment.resolved || !comment.range) return false
              const commentStart = comment.range.index
              const commentEnd = commentStart + comment.range.length
              return range.index >= commentStart && range.index < commentEnd
            })

            // If NOT in a comment, clear format so next typed character won't inherit it
            // This ensures proper spacing when typing after highlighted text
            if (!isInComment) {
              // Clear format at cursor position (length 0 means "next character")
              quill.value.formatText(range.index, 0, 'background', false)
            }
          }
        }
      })

      // Intercept keyboard input to prevent format inheritance BEFORE typing
      quill.value.root.addEventListener('keydown', (e) => {
        // Only handle regular typing keys (not special keys like Enter, Backspace, etc.)
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const selection = quill.value.getSelection(true)
          if (selection && selection.length === 0) {
            const format = quill.value.getFormat(selection.index, 1)
            if (format && format.background) {
              // Check if cursor is within a comment range
              const isInComment = highlightComments.value.some((comment) => {
                if (comment.resolved || !comment.range) return false
                const commentStart = comment.range.index
                const commentEnd = commentStart + comment.range.length
                return selection.index >= commentStart && selection.index < commentEnd
              })

              // If NOT in a comment, clear format BEFORE typing to ensure proper spacing
              if (!isInComment) {
                quill.value.formatText(selection.index, 0, 'background', false)
              }
            }
          }
        }
      })

      // Listen for selection changes
      quill.value.on('selection-change', (range, oldRange, source) => {
        emit('selection-change', range, oldRange, source)

        if (range && range.length > 0) {
          const text = quill.value.getText(range.index, range.length)
          if (text.trim()) {
            selectedText.value = text.trim()
            currentSelection.value = range
          }
        }
      })

      // Add custom highlight comment functionality
      addHighlightCommentHandler()
      addHighlightColorPicker()

      // Restore highlights after content is loaded (initial load only)
      // Set flag to allow restoration on initial load
      shouldRestoreHighlights.value = true
      setTimeout(() => {
        if (!isUserTyping.value) {
          restoreHighlights()
        }
      }, 500)

      // Add click handler for highlighted text
      quill.value.root.addEventListener('click', handleEditorClick)

      // Add right-click context menu
      quill.value.root.addEventListener('contextmenu', handleRightClick)

      // Add custom toolbar handlers (image upload)
      const toolbar = quill.value.getModule('toolbar')
      if (toolbar) {
        toolbar.addHandler('image', () => selectLocalImage())
      }
    }
  } catch (error) {
    console.error('Failed to initialize Quill editor:', error)
    // Fallback to basic textarea
    if (editorRef.value) {
      editorRef.value.innerHTML = `
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
          <p style="color: #ef4444; margin: 0;">Quill editor failed to load. Please check your internet connection.</p>
          <textarea 
            style="width: 100%; min-height: 300px; margin-top: 10px; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px;"
            placeholder="Fallback text editor - ${props.placeholder}"
          >${props.modelValue}</textarea>
        </div>
      `
    }
  }
})

// Watch for external content changes (when content is loaded from storage)
watch(
  () => props.modelValue,
  (newValue) => {
    if (quill.value && quill.value.root.innerHTML !== newValue) {
      // Only update if content actually changed (not just a re-render)
      const currentContent = quill.value.root.innerHTML
      if (currentContent !== newValue) {
        // Only restore highlights if user is NOT actively typing
        // This prevents highlights from being applied to new text the user is typing
        const wasUserTyping = isUserTyping.value

        quill.value.root.innerHTML = newValue

        // Only restore highlights when content is loaded from storage (not during user typing)
        if (!wasUserTyping && shouldRestoreHighlights.value) {
          // Restore highlights after content update (only when loading from storage)
          // This happens when navigating back to the project
          // We use a longer delay to ensure Quill has fully processed the content
          setTimeout(() => {
            restoreHighlights()
          }, 300)
        }
      }
    }
  },
)

// Load highlight comments from storage on mount
onMounted(() => {
  loadHighlightCommentsFromStorage()
})

// Highlight colors (like Google Docs)
const highlightColors = [
  { name: 'Yellow', value: '#ffeb3b', class: 'highlight-yellow' },
  { name: 'Green', value: '#c8e6c9', class: 'highlight-green' },
  { name: 'Blue', value: '#bbdefb', class: 'highlight-blue' },
  { name: 'Pink', value: '#f8bbd0', class: 'highlight-pink' },
  { name: 'Orange', value: '#ffe0b2', class: 'highlight-orange' },
  { name: 'Purple', value: '#e1bee7', class: 'highlight-purple' },
  { name: 'Remove', value: null, class: 'highlight-remove' },
]

// Convert full highlight color to semi-highlight (for commented text - like Google Docs)
const getSemiHighlightColor = (color) => {
  if (!color) return null

  // Convert hex to rgba with 0.4 opacity (semi-transparent like Google Docs)
  const hex = color.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, 0.4)`
}

// Add highlight color picker to toolbar
const addHighlightColorPicker = () => {
  if (!quill.value) return

  const toolbar = quill.value.getModule('toolbar')
  if (!toolbar || !toolbar.container) return

  const container = toolbar.container

  // Create highlight button (using marker/highlighter icon)
  const highlightButton = document.createElement('button')
  highlightButton.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>'
  highlightButton.title = 'Highlight text'
  highlightButton.className = 'ql-highlight'
  highlightButton.style.cssText = `
    background: none;
    border: none;
    cursor: pointer;
    padding: 5px;
    margin: 0 2px;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
  `

  highlightButton.addEventListener('click', (e) => {
    e.preventDefault()
    const range = quill.value.getSelection()
    if (range && range.length > 0) {
      currentSelection.value = range
      const text = quill.value.getText(range.index, range.length)
      selectedText.value = text.trim()
      showHighlightColorPicker.value = true
    } else {
      showNotification('Please select some text to highlight.', 'warning')
    }
  })

  // Insert after background color
  const bgGroup = container.querySelector('.ql-background')
  if (bgGroup && bgGroup.parentNode) {
    bgGroup.parentNode.insertBefore(highlightButton, bgGroup.nextSibling)
  } else {
    container.appendChild(highlightButton)
  }
}

// Add highlight comment handler
const addHighlightCommentHandler = () => {
  if (!quill.value) return

  const toolbar = quill.value.getModule('toolbar')
  if (!toolbar || !toolbar.container) return

  const container = toolbar.container

  // Create comment button
  const commentButton = document.createElement('button')
  commentButton.innerHTML = '💬'
  commentButton.title = 'Add comment to selected text'
  commentButton.className = 'ql-comment'
  commentButton.style.cssText = `
    background: none;
    border: none;
    cursor: pointer;
    padding: 5px;
    margin: 0 2px;
    border-radius: 3px;
    font-size: 16px;
    line-height: 1;
  `

  commentButton.addEventListener('click', (e) => {
    e.preventDefault()
    const range = quill.value.getSelection()
    if (range && range.length > 0) {
      const text = quill.value.getText(range.index, range.length)
      if (text.trim()) {
        selectedText.value = text.trim()
        currentSelection.value = range
        showHighlightComment.value = true
      }
    } else {
      showNotification('Please select some text to add a comment.', 'warning')
    }
  })

  // Insert after highlight button
  const highlightBtn = container.querySelector('.ql-highlight')
  if (highlightBtn && highlightBtn.parentNode) {
    highlightBtn.parentNode.insertBefore(commentButton, highlightBtn.nextSibling)
  } else {
    container.appendChild(commentButton)
  }
}

// Apply highlight with selected color
const applyHighlight = (color) => {
  if (!quill.value || !currentSelection.value) return

  const range = quill.value.getSelection() || currentSelection.value
  if (!range || range.length === 0) return

  if (color === null) {
    // Remove highlight
    quill.value.formatText(range.index, range.length, 'background', false)
  } else {
    // Apply highlight color
    quill.value.formatText(range.index, range.length, 'background', color)
  }

  showHighlightColorPicker.value = false
}

// Handle editor click to show comments
const handleEditorClick = (e) => {
  if (!quill.value) return

  const target = e.target
  if (target.hasAttribute('data-comment-id')) {
    const commentId = parseInt(target.getAttribute('data-comment-id'))
    const comment = highlightComments.value.find((c) => c.id === commentId)
    if (comment) {
      activeCommentId.value = commentId
      // Show comment in sidebar or popup
      emit('show-comment', comment)
    }
  }
}

// Handle right-click for context menu
const handleRightClick = (e) => {
  if (props.readOnly) return

  const range = quill.value.getSelection()
  if (range && range.length > 0) {
    e.preventDefault()
    // Could add context menu here in the future
  }
}

// Find text in Quill content and return its range
// Only matches exact text to prevent highlighting new text that happens to match
const findTextInQuill = (searchText) => {
  if (!quill.value || !searchText) return null

  try {
    const fullText = quill.value.getText()
    const normalizedSearch = searchText.trim()

    // Only try exact match first (with trimmed search text)
    // This prevents matching partial text or similar text
    let searchIndex = fullText.indexOf(normalizedSearch)

    // If not found with trimmed, try with original (in case whitespace is preserved)
    if (searchIndex === -1 && searchText !== normalizedSearch) {
      searchIndex = fullText.indexOf(searchText)
    }

    // If still not found, try to find it with normalized whitespace
    // But only if the search text is meaningful (more than 3 characters)
    // This prevents matching single words that might appear in new text
    if (searchIndex === -1 && normalizedSearch.length > 3) {
      // Normalize both texts (replace multiple spaces with single space)
      const normalizedFullText = fullText.replace(/\s+/g, ' ').trim()
      const normalizedSearchText = normalizedSearch.replace(/\s+/g, ' ').trim()

      const normalizedIndex = normalizedFullText.indexOf(normalizedSearchText)

      if (normalizedIndex !== -1) {
        // Found in normalized text - now find the actual position in original
        // This is more complex but we'll try to find a reasonable match
        // Only proceed if we can find a unique match
        const matches = []
        let pos = 0
        while ((pos = fullText.indexOf(normalizedSearchText, pos)) !== -1) {
          matches.push(pos)
          pos += 1
        }

        // If there's only one match, use it
        if (matches.length === 1) {
          searchIndex = matches[0]
        } else if (matches.length > 1) {
          // Multiple matches - this is ambiguous, don't match
          // This prevents highlighting the wrong instance
          return null
        }
      }
    }

    if (searchIndex === -1) {
      // Text not found - might have been edited or deleted
      return null
    }

    // Verify the match is reasonable - check surrounding context if possible
    // Return the range with the normalized search text length
    return {
      index: searchIndex,
      length: normalizedSearch.length || searchText.length,
    }
  } catch (error) {
    console.error('Error finding text in Quill:', error)
    return null
  }
}

// Restore highlights when content loads
// Only restores highlights for the original highlighted text, not new text
const restoreHighlights = () => {
  // Don't restore if user is actively typing
  if (isUserTyping.value || !shouldRestoreHighlights.value) {
    return
  }

  if (!quill.value || highlightComments.value.length === 0) return

  highlightComments.value.forEach((comment) => {
    // Skip resolved comments
    if (comment.resolved) return

    if (comment.range && comment.text) {
      try {
        // Find the actual text in the current content (text might have moved)
        // This will only match the exact original text, not new similar text
        const foundRange = findTextInQuill(comment.text)

        if (!foundRange) {
          // Text not found - comment might be on deleted/changed text
          // Don't warn for this as it's normal if text was edited
          return
        }

        // Verify the found text matches what we expect
        const foundText = quill.value.getText(foundRange.index, foundRange.length).trim()
        if (foundText !== comment.text.trim() && foundText.length < 3) {
          // Text doesn't match or is too short - might be matching wrong text
          return
        }

        // Update the comment's range to match current content position
        comment.range = foundRange

        // Use semi-highlight color for commented text (like Google Docs)
        // If semiColor exists, use it; otherwise convert the color to semi-highlight
        const highlightColor =
          comment.semiColor || getSemiHighlightColor(comment.color) || 'rgba(255, 235, 59, 0.4)'

        // Apply semi-highlight color (commented text is always semi-highlighted)
        quill.value.formatText(foundRange.index, foundRange.length, 'background', highlightColor)

        // Add comment indicator (only for unresolved comments)
        if (!comment.resolved) {
          setTimeout(() => {
            addCommentIndicator(comment)
          }, 50)
        }
      } catch (error) {
        console.error('Error restoring highlight:', error)
      }
    }
  })

  // Save updated ranges back to storage
  saveHighlightCommentsToStorage()
}

// Add comment indicator to highlighted text
const addCommentIndicator = (comment) => {
  if (!quill.value) return

  try {
    const [leaf, offset] = quill.value.getLeaf(comment.range.index)
    if (leaf && leaf.domNode) {
      const node = leaf.domNode

      // Check if indicator already exists
      if (node.querySelector(`[data-comment-indicator="${comment.id}"]`)) {
        return
      }

      // Create comment indicator bubble
      const indicator = document.createElement('span')
      indicator.setAttribute('data-comment-indicator', comment.id)
      indicator.setAttribute('data-comment-id', comment.id)
      indicator.className = 'comment-indicator'
      indicator.innerHTML = '💬'
      indicator.title = `Comment: ${comment.comment}`
      indicator.style.cssText = `
        position: absolute;
        top: -8px;
        right: -8px;
        width: 18px;
        height: 18px;
        background: #3b82f6;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        cursor: pointer;
        z-index: 10;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        transition: transform 0.2s ease;
      `

      indicator.addEventListener('click', (e) => {
        e.stopPropagation()
        activeCommentId.value = comment.id
        emit('show-comment', comment)
      })

      indicator.addEventListener('mouseenter', () => {
        indicator.style.transform = 'scale(1.2)'
      })

      indicator.addEventListener('mouseleave', () => {
        indicator.style.transform = 'scale(1)'
      })

      // Make parent position relative
      if (node.parentElement) {
        node.parentElement.style.position = 'relative'
        node.parentElement.appendChild(indicator)
      }
    }
  } catch (error) {
    console.error('Error adding comment indicator:', error)
  }
}

// Apply highlight with color
const applyHighlightWithColor = (color) => {
  const range = quill.value.getSelection() || currentSelection.value
  if (!range || range.length === 0) return

  if (color === null) {
    // Remove highlight
    quill.value.formatText(range.index, range.length, 'background', false)
    // Also remove any comments on this range
    const commentsToRemove = highlightComments.value.filter(
      (c) => c.range.index === range.index && c.range.length === range.length,
    )
    commentsToRemove.forEach((c) => {
      const index = highlightComments.value.findIndex((comment) => comment.id === c.id)
      if (index !== -1) {
        // Remove comment indicator
        try {
          const indicators = quill.value.root.querySelectorAll(`[data-comment-indicator="${c.id}"]`)
          indicators.forEach((indicator) => indicator.remove())
        } catch (error) {
          console.error('Error removing comment indicator:', error)
        }
        highlightComments.value.splice(index, 1)
      }
    })
    saveHighlightCommentsToStorage()
    emit('highlight-comments-updated', highlightComments.value)
  } else {
    // Check if there's already a comment on this range
    const existingComment = highlightComments.value.find(
      (c) => c.range.index === range.index && c.range.length === range.length && !c.resolved,
    )

    if (existingComment) {
      // If comment exists, use semi-highlight color (like Google Docs)
      const semiColor = getSemiHighlightColor(color)
      quill.value.formatText(range.index, range.length, 'background', semiColor)
      // Update comment color
      existingComment.color = color
      existingComment.semiColor = semiColor
      saveHighlightCommentsToStorage()
    } else {
      // Apply full highlight color (no comment yet - regular highlight)
      quill.value.formatText(range.index, range.length, 'background', color)
    }
  }

  showHighlightColorPicker.value = false
  selectedHighlightColor.value = color
}

// Add highlight comment
const addHighlightComment = () => {
  if (highlightComment.value.trim() && currentSelection.value && quill.value) {
    const range = currentSelection.value

    // Get the actual text at this range from Quill (not trimmed, to preserve exact match)
    const actualText = quill.value.getText(range.index, range.length)

    if (!actualText || !actualText.trim()) {
      console.warn('No text selected for comment')
      return
    }

    // Check if text is already highlighted, if not, apply default yellow
    const format = quill.value.getFormat(range.index, range.length)
    let highlightColor = format.background || selectedHighlightColor.value || '#ffeb3b'

    // Convert to semi-highlight color (like Google Docs - commented text is always semi-highlighted)
    const semiHighlightColor = getSemiHighlightColor(highlightColor)

    // Apply semi-highlight color when comment is added (like Google Docs)
    quill.value.formatText(range.index, range.length, 'background', semiHighlightColor)

    // Store comment with original color and semi-highlight color
    // IMPORTANT: Store the actual text content (trimmed for display, but we'll search for the trimmed version)
    // This allows us to find the text even if whitespace changes
    const comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: actualText.trim(), // Store trimmed text for finding it later (handles whitespace changes)
      comment: highlightComment.value,
      author: 'Current User',
      timestamp: new Date().toISOString(),
      color: highlightColor, // Store original color
      semiColor: semiHighlightColor, // Store semi-highlight color
      resolved: false, // Track if comment is resolved/done
      range: {
        index: range.index,
        length: range.length,
      },
    }

    highlightComments.value.push(comment)

    // Save to localStorage
    saveHighlightCommentsToStorage()

    // Emit the updated comments
    emit('highlight-comments-updated', highlightComments.value)

    // Add comment indicator
    setTimeout(() => {
      addCommentIndicator(comment)
    }, 100)

    // Clear form
    highlightComment.value = ''
    showHighlightComment.value = false
    selectedText.value = ''
    currentSelection.value = null
  }
}

// Cancel highlight comment
const cancelHighlightComment = () => {
  showHighlightComment.value = false
  highlightComment.value = ''
  selectedText.value = ''
  currentSelection.value = null
}

// Get highlight comments
const getHighlightComments = () => {
  return highlightComments.value
}

// Delete highlight comment
const deleteHighlightComment = (commentId) => {
  const index = highlightComments.value.findIndex((c) => c.id === commentId)
  if (index !== -1) {
    const comment = highlightComments.value[index]

    // Remove comment indicator and highlight, but keep the text
    if (quill.value && comment.range) {
      try {
        // Remove comment indicators
        const indicators = quill.value.root.querySelectorAll(
          `[data-comment-indicator="${commentId}"]`,
        )
        indicators.forEach((indicator) => indicator.remove())

        // Remove the highlight but keep the text
        if (comment.range.index !== undefined && comment.range.length > 0) {
          try {
            // Verify the text still exists at this range
            const text = quill.value.getText(comment.range.index, comment.range.length)
            if (text) {
              // Clear background format - this removes the highlight but keeps the text
              quill.value.formatText(comment.range.index, comment.range.length, 'background', false)
            }
          } catch (error) {
            // If range is invalid, try to find the text and clear it
            const allText = quill.value.getText()
            const commentText = comment.text || comment.actualText
            if (commentText && allText.includes(commentText)) {
              const textIndex = allText.indexOf(commentText)
              if (textIndex !== -1) {
                quill.value.formatText(textIndex, commentText.length, 'background', false)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error removing comment indicator:', error)
      }
    }

    // Remove comment from array
    highlightComments.value.splice(index, 1)
    saveHighlightCommentsToStorage()
    emit('highlight-comments-updated', highlightComments.value)
    return true
  }
  return false
}

// Toggle comment resolved status (like Google Docs)
// When resolved, the comment is "done" and should be hidden/removed from view
const toggleCommentResolved = (commentId) => {
  const index = highlightComments.value.findIndex((c) => c.id === commentId)
  if (index !== -1) {
    const comment = highlightComments.value[index]
    comment.resolved = !comment.resolved

    // Remove the visual indicator from the editor when resolved (comment is done)
    if (quill.value && comment.resolved) {
      try {
        const indicators = quill.value.root.querySelectorAll(
          `[data-comment-indicator="${commentId}"]`,
        )
        indicators.forEach((indicator) => indicator.remove())

        // Also remove the highlight when resolved (like Google Docs - resolved comments don't show highlights)
        quill.value.formatText(comment.range.index, comment.range.length, 'background', false)
      } catch (error) {
        console.error('Error removing comment indicator:', error)
      }
    } else if (quill.value && !comment.resolved) {
      // If unresolving, restore the semi-highlight and indicator
      const semiColor =
        comment.semiColor || getSemiHighlightColor(comment.color) || 'rgba(255, 235, 59, 0.4)'
      quill.value.formatText(comment.range.index, comment.range.length, 'background', semiColor)
      setTimeout(() => {
        addCommentIndicator(comment)
      }, 50)
    }

    saveHighlightCommentsToStorage()
    emit('highlight-comments-updated', highlightComments.value)
    return true
  }
  return false
}

// Set read-only mode
const setReadOnly = (readOnly) => {
  if (quill.value) {
    quill.value.enable(!readOnly)
  }
}

// Clear all highlight comments
const clearHighlightComments = () => {
  highlightComments.value = []
  saveHighlightCommentsToStorage()
  emit('highlight-comments-updated', highlightComments.value)
}

// localStorage functions for highlight comments
const getHighlightCommentsKey = () => {
  if (!props.projectId) return null
  return `${props.projectType}_highlight_comments_${props.projectId}`
}

const loadHighlightCommentsFromStorage = () => {
  try {
    const key = getHighlightCommentsKey()
    if (!key) return

    const stored = localStorage.getItem(key)
    if (stored) {
      const comments = JSON.parse(stored)
      // Ensure all comments have resolved property and semiColor (backward compatibility)
      highlightComments.value = comments.map((comment) => {
        const originalColor = comment.color || '#ffeb3b'
        return {
          ...comment,
          resolved: comment.resolved !== undefined ? comment.resolved : false,
          color: originalColor,
          semiColor:
            comment.semiColor || getSemiHighlightColor(originalColor) || 'rgba(255, 235, 59, 0.4)',
        }
      })
      console.log('Loaded highlight comments from storage:', highlightComments.value)
    }
  } catch (error) {
    console.error('Error loading highlight comments from storage:', error)
  }
}

const saveHighlightCommentsToStorage = () => {
  try {
    const key = getHighlightCommentsKey()
    if (!key) return

    localStorage.setItem(key, JSON.stringify(highlightComments.value))
    console.log('Saved highlight comments to storage:', highlightComments.value)
  } catch (error) {
    console.error('Error saving highlight comments to storage:', error)
  }
}

// Get editor content
const getContent = () => {
  return quill.value ? quill.value.root.innerHTML : ''
}

// Set editor content
const setContent = (content) => {
  if (quill.value) {
    quill.value.root.innerHTML = content
  }
}

// Focus editor
const focus = () => {
  if (quill.value) {
    quill.value.focus()
  }
}

// React to readOnly prop changes and external v-model updates
watch(
  () => props.readOnly,
  (ro) => {
    if (quill.value) quill.value.enable(!ro)
  },
)

// Show notification card
const showNotification = (message, type = 'warning') => {
  notificationMessage.value = message
  notificationType.value = type
  showNotificationCard.value = true

  // Auto-hide after 3 seconds
  setTimeout(() => {
    showNotificationCard.value = false
  }, 3000)
}

// Local image upload handler
const selectLocalImage = () => {
  // Check if image uploads are disabled for this role
  if (props.disableImages) {
    showNotification(
      'Image upload is disabled for Technical Editor role. Only Creative Director (Artists) can upload images.',
      'warning',
    )
    return
  }

  const input = document.createElement('input')
  input.setAttribute('type', 'file')
  input.setAttribute('accept', 'image/*')
  input.onchange = () => {
    const file = input.files && input.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const range = quill.value.getSelection(true)
      quill.value.insertEmbed(range ? range.index : 0, 'image', reader.result, 'user')
      if (range) quill.value.setSelection(range.index + 1, 0)
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

// Expose methods
defineExpose({
  getContent,
  setContent,
  focus,
  quill,
  getHighlightComments,
  deleteHighlightComment,
  toggleCommentResolved,
  clearHighlightComments,
  setReadOnly,
  applyHighlight,
})
</script>

<template>
  <div class="quill-editor-container" style="position: relative">
    <!-- Quill Editor -->
    <div ref="editorRef" class="quill-editor" :style="{ height: height }"></div>

    <!-- Highlight Color Picker Dialog -->
    <v-dialog v-model="showHighlightColorPicker" max-width="400px" persistent>
      <v-card class="highlight-color-picker-card">
        <v-card-title class="picker-header">
          <v-icon class="mr-2">mdi-format-color-highlight</v-icon>
          <span>Choose Highlight Color</span>
        </v-card-title>
        <v-card-text class="picker-content">
          <div class="color-grid">
            <div
              v-for="color in highlightColors"
              :key="color.name"
              class="color-item"
              :class="color.class"
              @click="applyHighlightWithColor(color.value)"
            >
              <div
                v-if="color.value"
                class="color-swatch"
                :style="{ backgroundColor: color.value }"
              ></div>
              <div v-else class="color-swatch remove-highlight">
                <v-icon size="20" color="grey">mdi-close</v-icon>
              </div>
              <span class="color-name">{{ color.name }}</span>
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="picker-actions">
          <v-btn @click="showHighlightColorPicker = false" variant="text" block> Cancel </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Highlight Comment Dialog (Google Docs style) -->
    <v-dialog v-model="showHighlightComment" max-width="600px" persistent>
      <v-card class="comment-dialog-card">
        <v-card-title class="comment-dialog-header">
          <v-icon class="mr-2" color="white">mdi-comment-text</v-icon>
          <span>Add Comment</span>
        </v-card-title>
        <v-divider />
        <v-card-text class="comment-dialog-content">
          <div class="selected-text-preview">
            <div class="preview-label">Selected text:</div>
            <div class="preview-text">"{{ selectedText }}"</div>
          </div>
          <v-textarea
            v-model="highlightComment"
            placeholder="Add a comment..."
            rows="4"
            variant="outlined"
            hide-details
            class="comment-input"
            autofocus
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="comment-dialog-actions">
          <v-btn @click="cancelHighlightComment" variant="outlined" size="default"> Cancel </v-btn>
          <v-spacer />
          <v-btn
            @click="addHighlightComment"
            color="primary"
            variant="flat"
            size="default"
            :disabled="!highlightComment.trim()"
            prepend-icon="mdi-comment-plus"
          >
            Comment
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Notification Card -->
    <transition name="slide-down">
      <v-card
        v-if="showNotificationCard"
        class="notification-card"
        :class="`notification-${notificationType}`"
        elevation="4"
      >
        <div class="notification-content">
          <v-icon
            :color="notificationType === 'warning' ? 'warning' : 'info'"
            size="24"
            class="notification-icon"
          >
            {{ notificationType === 'warning' ? 'mdi-alert' : 'mdi-information' }}
          </v-icon>
          <span class="notification-message">{{ notificationMessage }}</span>
          <v-btn
            icon
            size="small"
            variant="text"
            @click="showNotificationCard = false"
            class="notification-close"
          >
            <v-icon size="20">mdi-close</v-icon>
          </v-btn>
        </div>
      </v-card>
    </transition>
  </div>
</template>

<style scoped>
.quill-editor-container {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.quill-editor {
  background: white;
}

/* Custom Quill styles */
:deep(.ql-toolbar) {
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  padding: 12px;
}

:deep(.ql-container) {
  border: none;
  font-size: 14px;
  line-height: 1.6;
}

:deep(.ql-editor) {
  padding: 20px;
  min-height: 300px;
  color: #374151;
}

:deep(.ql-editor.ql-blank::before) {
  color: #9ca3af;
  font-style: normal;
}

/* Toolbar button styles */
:deep(.ql-toolbar .ql-formats) {
  margin-right: 15px;
}

:deep(.ql-toolbar button) {
  padding: 5px;
  margin: 0 2px;
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

:deep(.ql-toolbar button:hover) {
  background-color: #e5e7eb;
}

:deep(.ql-toolbar button.ql-active) {
  background-color: #3b82f6;
  color: white;
}

/* Custom comment button styles */
:deep(.ql-toolbar .ql-comment) {
  background: none !important;
  border: none !important;
  cursor: pointer !important;
  padding: 5px !important;
  margin: 0 2px !important;
  border-radius: 3px !important;
  font-size: 16px !important;
  line-height: 1 !important;
  transition: background-color 0.2s ease !important;
}

:deep(.ql-toolbar .ql-comment:hover) {
  background-color: #e5e7eb !important;
}

/* Highlighted text with comments */
:deep(.ql-editor span[data-comment-id]),
:deep(.ql-editor [style*='background-color']) {
  position: relative;
  cursor: pointer;
  padding: 2px 0;
  border-radius: 2px;
}

:deep(.ql-editor span[data-comment-id]:hover),
:deep(.ql-editor [style*='background-color']:hover) {
  opacity: 0.9;
}

/* Comment indicator bubble */
:deep(.comment-indicator) {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 18px;
  height: 18px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

:deep(.comment-indicator:hover) {
  transform: scale(1.2);
  background: #2563eb;
}

/* Highlight color picker styles */
.highlight-color-picker-card {
  border: 2px solid #353535 !important;
  border-radius: 8px !important;
}

.picker-header {
  background: #353535 !important;
  color: white !important;
  padding: 16px 20px !important;
  display: flex;
  align-items: center;
}

.picker-content {
  padding: 20px !important;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.color-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-item:hover {
  border-color: #3b82f6;
  background: #f0f9ff;
  transform: translateY(-2px);
}

.color-swatch {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  border: 2px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-highlight {
  background: #f3f4f6;
}

.color-name {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
}

.picker-actions {
  padding: 12px 20px !important;
  background: #fafafa;
}

/* Comment dialog styles */
.comment-dialog-card {
  border: 2px solid #353535 !important;
  border-radius: 8px !important;
}

.comment-dialog-header {
  background: #353535 !important;
  color: white !important;
  padding: 16px 20px !important;
  display: flex;
  align-items: center;
}

.comment-dialog-content {
  padding: 20px !important;
}

.selected-text-preview {
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 16px;
}

.preview-label {
  font-size: 12px;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 4px;
}

.preview-text {
  font-size: 14px;
  color: #78350f;
  font-style: italic;
}

.comment-input {
  margin-top: 8px;
}

.comment-dialog-actions {
  padding: 12px 20px !important;
  background: #fafafa;
}

/* Color picker styles */
:deep(.ql-color .ql-picker-options) {
  width: 200px;
  padding: 10px;
}

:deep(.ql-color .ql-picker-item) {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  margin: 2px;
}

/* Responsive design */
@media (max-width: 768px) {
  :deep(.ql-toolbar) {
    padding: 8px;
  }

  :deep(.ql-toolbar .ql-formats) {
    margin-right: 10px;
  }

  :deep(.ql-editor) {
    padding: 15px;
    min-height: 250px;
  }
}
/* Notification Card Styles */
.notification-card {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1000;
  min-width: 300px;
  max-width: 400px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  border: 2px solid #353535 !important;
}

.notification-warning {
  background: #fff7ed !important;
  border-color: #f59e0b !important;
}

.notification-info {
  background: #eff6ff !important;
  border-color: #3b82f6 !important;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.notification-icon {
  flex-shrink: 0;
}

.notification-message {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  line-height: 1.5;
}

.notification-close {
  flex-shrink: 0;
  color: #6b7280 !important;
}

.notification-close:hover {
  color: #374151 !important;
  background: rgba(0, 0, 0, 0.05) !important;
}

/* Slide down animation */
.slide-down-enter-active {
  transition: all 0.3s ease-out;
}

.slide-down-leave-active {
  transition: all 0.3s ease-in;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
