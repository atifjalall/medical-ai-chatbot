import * as React from 'react'
import Textarea from 'react-textarea-autosize'
import { useActions, useUIState } from 'ai/rsc'
import { UserMessage } from './stocks/message'
import { type AI } from '@/lib/chat/actions'
import { Button } from '@/components/ui/button'
import { IconArrowElbow, IconPlus } from '@/components/ui/icons'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useEnterSubmit } from '@/lib/hooks/use-enter-submit'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'

export function PromptForm({
  input,
  setInput
}: {
  input: string
  setInput: (value: string) => void
}) {
  const { formRef, onKeyDown } = useEnterSubmit()
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const { submitUserMessage, analyzeImage } = useActions()
  const [_, setMessages] = useUIState<typeof AI>()
  const [uploadedImage, setUploadedImage] = React.useState<string | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleImageUpload = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size too large. Please upload an image under 5MB.')
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload only image files')
      return
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onloadend = () => {
      setUploadedImage(reader.result as string)
      toast.success(
        'Image uploaded successfully. You can now send your message.'
      )
    }

    reader.onerror = () => {
      toast.error('Error reading file. Please try again.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (window.innerWidth < 600) {
      inputRef.current?.blur()
    }

    const value = input.trim()
    setInput('')

    if (!uploadedImage && !value) return

    let messageContent = value || 'Please analyze this medical image.'

    setMessages(currentMessages => [
      ...currentMessages,
      {
        id: nanoid(),
        display: (
          <>
            <UserMessage>{messageContent}</UserMessage>
            {uploadedImage && (
              <img
                src={uploadedImage}
                alt="Uploaded medical image"
                className="mt-2 max-w-[200px] max-h-[200px] object-cover rounded-lg"
              />
            )}
          </>
        )
      }
    ])

    try {
      if (uploadedImage) {
        const responseMessage = await analyzeImage(uploadedImage)
        setMessages(currentMessages => [...currentMessages, responseMessage])
      } else {
        const responseMessage = await submitUserMessage(value)
        setMessages(currentMessages => [...currentMessages, responseMessage])
      }
    } catch (error) {
      toast.error('Failed to send message. Please try again.')
    }

    setUploadedImage(null)
  }

  return (
    <div className="relative">
      {uploadedImage && (
        <div className="absolute -top-16 left-0 right-0 flex justify-center">
          <div className="relative inline-block">
            <img
              src={uploadedImage}
              alt="Uploaded medical image"
              className="max-w-[100px] max-h-[100px] object-cover rounded-lg"
            />
            <button
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              onClick={() => setUploadedImage(null)}
            >
              <IconPlus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <form ref={formRef} onSubmit={handleSubmit}>
        <input
          type="file"
          className="hidden"
          id="file"
          accept="image/*"
          ref={fileRef}
          onChange={event => {
            const file = event.target.files?.[0]
            if (file) {
              handleImageUpload(file)
            }
          }}
        />
        <div className="relative flex max-h-60 w-full grow flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-800 px-12 sm:rounded-full sm:px-12">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-[14px] size-8 rounded-full bg-background dark:bg-zinc-700 p-0 sm:left-4"
                onClick={() => fileRef.current?.click()}
              >
                <IconPlus className="text-zinc-900 dark:text-zinc-100" />
                <span className="sr-only">Upload Image</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Upload Medical Image</TooltipContent>
          </Tooltip>
          <Textarea
            ref={inputRef}
            tabIndex={0}
            onKeyDown={onKeyDown}
            placeholder={
              uploadedImage
                ? 'Describe the uploaded image or ask a question...'
                : 'Describe your symptoms or ask a medical question...'
            }
            className="min-h-[60px] w-full bg-transparent placeholder:text-zinc-900 dark:placeholder:text-zinc-300 resize-none px-4 py-[1.3rem] focus-within:outline-none sm:text-sm"
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            name="message"
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <div className="absolute right-4 top-[13px] sm:right-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  size="icon"
                  disabled={!uploadedImage && input === ''}
                  className="bg-transparent shadow-none text-zinc-950 dark:text-zinc-100 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  <IconArrowElbow />
                  <span className="sr-only">Send message</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send message</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </form>
    </div>
  )
}
