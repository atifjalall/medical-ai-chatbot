'use client'

import * as React from 'react'
import { ThemeProvider } from 'next-themes'
import { ThemeProviderProps } from 'next-themes/dist/types'
import { SidebarProvider } from '@/lib/hooks/use-sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <SidebarProvider>
      <TooltipProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </TooltipProvider>
    </SidebarProvider>
  )
}
